from datetime import datetime

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, CaregiverAssignment, SystemLog, LoginHistory
from apps.medications.models import Medication, Refill
from apps.adherence.models import DoseLog
from apps.notifications.models import Notification, NotificationLog
from apps.reminders.models import Reminder


REPORT_TYPES = [
    "patient",
    "medicine",
    "adherence",
    "missed_dose",
    "caregiver",
    "refill",
    "system_usage",
    "notification",
    "weekly",
    "monthly",
]


def _require_admin(user):
    if user.role != User.Role.ADMIN:
        raise PermissionDenied("Admin access required.")


def _parse_dates(request):
    start_date = request.query_params.get("startDate")
    end_date = request.query_params.get("endDate")

    parsed_start = None
    parsed_end = None

    if start_date:
        try:
            parsed_start = datetime.strptime(
                start_date, "%Y-%m-%d"
            ).date()
        except ValueError:
            raise ValueError(
                "startDate must use YYYY-MM-DD format."
            )

    if end_date:
        try:
            parsed_end = datetime.strptime(
                end_date, "%Y-%m-%d"
            ).date()
        except ValueError:
            raise ValueError(
                "endDate must use YYYY-MM-DD format."
            )

    if parsed_start and parsed_end and parsed_start > parsed_end:
        raise ValueError(
            "startDate cannot be later than endDate."
        )

    return parsed_start, parsed_end


def _full_name(user):
    return user.get_full_name() or user.username


def _format_date(value):
    if not value:
        return ""

    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")

    return str(value)


def _format_datetime(value):
    if not value:
        return ""

    if timezone.is_aware(value):
        value = timezone.localtime(value)

    return value.strftime("%Y-%m-%d %H:%M:%S")


def _safe_percentage(value):
    return round(float(value), 2)


def _filter_dose_logs(queryset, start_date, end_date):
    if start_date:
        queryset = queryset.filter(
            scheduled_date__gte=start_date
        )

    if end_date:
        queryset = queryset.filter(
            scheduled_date__lte=end_date
        )

    return queryset


def _build_patient_report(start_date, end_date):
    users = User.objects.filter(
        role=User.Role.PATIENT
    ).order_by("username")

    if start_date:
        users = users.filter(
            date_joined__date__gte=start_date
        )

    if end_date:
        users = users.filter(
            date_joined__date__lte=end_date
        )

    headers = [
        "Patient ID",
        "Username",
        "Full Name",
        "Email",
        "Phone",
        "Active",
        "Date Joined",
    ]

    rows = [
        [
            user.id,
            user.username,
            _full_name(user),
            user.email or "",
            user.phone_number or "",
            "Yes" if user.is_active else "No",
            _format_datetime(user.date_joined),
        ]
        for user in users
    ]

    return headers, rows


def _build_medicine_report(start_date, end_date):
    medicines = Medication.objects.select_related(
        "patient"
    ).order_by("name")

    if start_date:
        medicines = medicines.filter(
            created_at__date__gte=start_date
        )

    if end_date:
        medicines = medicines.filter(
            created_at__date__lte=end_date
        )

    headers = [
        "Medicine ID",
        "Patient",
        "Medicine",
        "Dosage",
        "Frequency",
        "Doses / Day",
        "Total Stock",
        "Remaining Stock",
        "Condition",
        "Created At",
    ]

    rows = [
        [
            medicine.id,
            _full_name(medicine.patient),
            medicine.name,
            medicine.dosage,
            medicine.frequency,
            medicine.doses_per_day,
            medicine.total_stock,
            medicine.remaining_stock,
            medicine.condition or "",
            _format_datetime(medicine.created_at),
        ]
        for medicine in medicines
    ]

    return headers, rows


def _build_adherence_report(start_date, end_date):
    logs = DoseLog.objects.select_related(
        "medication",
        "medication__patient",
    )

    logs = _filter_dose_logs(
        logs,
        start_date,
        end_date,
    )

    logs = logs.order_by(
        "-scheduled_date",
        "-scheduled_time",
    )

    grouped = {}

    for log in logs:
        key = (
            log.medication.patient_id,
            log.medication_id,
        )

        if key not in grouped:
            grouped[key] = {
                "patient": _full_name(
                    log.medication.patient
                ),
                "medicine": log.medication.name,
                "scheduled": 0,
                "taken": 0,
                "missed": 0,
                "pending": 0,
            }

        grouped[key]["scheduled"] += 1

        if log.status == "taken":
            grouped[key]["taken"] += 1
        elif log.status == "missed":
            grouped[key]["missed"] += 1
        else:
            grouped[key]["pending"] += 1

    headers = [
        "Patient",
        "Medicine",
        "Scheduled Doses",
        "Taken",
        "Missed",
        "Pending",
        "Adherence %",
    ]

    rows = []

    for item in grouped.values():
        completed = item["taken"] + item["missed"]

        adherence = (
            (item["taken"] / completed) * 100
            if completed
            else 0
        )

        rows.append(
            [
                item["patient"],
                item["medicine"],
                item["scheduled"],
                item["taken"],
                item["missed"],
                item["pending"],
                _safe_percentage(adherence),
            ]
        )

    return headers, rows


def _build_missed_dose_report(start_date, end_date):
    logs = DoseLog.objects.select_related(
        "medication",
        "medication__patient",
    ).filter(status="missed")

    logs = _filter_dose_logs(
        logs,
        start_date,
        end_date,
    )

    logs = logs.order_by(
        "-scheduled_date",
        "-scheduled_time",
    )

    headers = [
        "Log ID",
        "Patient",
        "Medicine",
        "Date",
        "Time",
        "Status",
    ]

    rows = [
        [
            log.id,
            _full_name(log.medication.patient),
            log.medication.name,
            _format_date(log.scheduled_date),
            log.scheduled_time.strftime("%H:%M"),
            log.status,
        ]
        for log in logs
    ]

    return headers, rows


def _build_caregiver_report(start_date, end_date):
    assignments = CaregiverAssignment.objects.select_related(
        "caregiver",
        "patient",
    ).order_by("-assigned_at")

    if start_date:
        assignments = assignments.filter(
            assigned_at__date__gte=start_date
        )

    if end_date:
        assignments = assignments.filter(
            assigned_at__date__lte=end_date
        )

    headers = [
        "Assignment ID",
        "Caregiver",
        "Caregiver Email",
        "Patient",
        "Patient Email",
        "Assigned At",
    ]

    rows = [
        [
            assignment.id,
            _full_name(assignment.caregiver),
            assignment.caregiver.email or "",
            _full_name(assignment.patient),
            assignment.patient.email or "",
            _format_datetime(assignment.assigned_at),
        ]
        for assignment in assignments
    ]

    return headers, rows


def _build_refill_report(start_date, end_date):
    refills = Refill.objects.select_related(
        "medication",
        "medication__patient",
    ).order_by("-refill_date", "-id")

    if start_date:
        refills = refills.filter(
            refill_date__gte=start_date
        )

    if end_date:
        refills = refills.filter(
            refill_date__lte=end_date
        )

    headers = [
        "Refill ID",
        "Patient",
        "Medicine",
        "Quantity",
        "Refill Date",
        "Remaining Stock",
        "Doses / Day",
        "Estimated Days Remaining",
    ]

    rows = []

    for refill in refills:
        medication = refill.medication
        daily_dose = medication.doses_per_day or 1

        days_remaining = (
            medication.remaining_stock // daily_dose
        )

        rows.append(
            [
                refill.id,
                _full_name(medication.patient),
                medication.name,
                refill.quantity,
                _format_date(refill.refill_date),
                medication.remaining_stock,
                daily_dose,
                days_remaining,
            ]
        )

    return headers, rows


def _build_system_usage_report(start_date, end_date):
    users = User.objects.all()

    if start_date:
        users = users.filter(
            date_joined__date__gte=start_date
        )

    if end_date:
        users = users.filter(
            date_joined__date__lte=end_date
        )

    role_summary = {
        User.Role.PATIENT: 0,
        User.Role.CAREGIVER: 0,
        User.Role.ADMIN: 0,
    }

    active_summary = 0
    inactive_summary = 0

    for user in users:
        role_summary[user.role] = (
            role_summary.get(user.role, 0) + 1
        )

        if user.is_active:
            active_summary += 1
        else:
            inactive_summary += 1

    medications = Medication.objects.all()

    if start_date:
        medications = medications.filter(
            created_at__date__gte=start_date
        )

    if end_date:
        medications = medications.filter(
            created_at__date__lte=end_date
        )

    reminders = Reminder.objects.all()

    if start_date:
        reminders = reminders.filter(
            date__gte=start_date
        )

    if end_date:
        reminders = reminders.filter(
            date__lte=end_date
        )

    headers = [
        "Metric",
        "Value",
    ]

    rows = [
        ["Total Users", users.count()],
        [
            "Patients",
            role_summary.get(User.Role.PATIENT, 0),
        ],
        [
            "Caregivers",
            role_summary.get(User.Role.CAREGIVER, 0),
        ],
        [
            "Admins",
            role_summary.get(User.Role.ADMIN, 0),
        ],
        ["Active Users", active_summary],
        ["Inactive Users", inactive_summary],
        ["Medications", medications.count()],
        ["Reminders", reminders.count()],
    ]

    return headers, rows


def _build_notification_report(start_date, end_date):
    notifications = Notification.objects.select_related(
        "user"
    ).order_by("-created_at")

    if start_date:
        notifications = notifications.filter(
            created_at__date__gte=start_date
        )

    if end_date:
        notifications = notifications.filter(
            created_at__date__lte=end_date
        )

    headers = [
        "Notification ID",
        "User",
        "Type",
        "Title",
        "Message",
        "Read",
        "Created At",
    ]

    rows = [
        [
            notification.id,
            _full_name(notification.user),
            notification.type,
            notification.title,
            notification.message,
            "Yes" if notification.is_read else "No",
            _format_datetime(notification.created_at),
        ]
        for notification in notifications
    ]

    return headers, rows


def _build_weekly_report(start_date, end_date):
    logs = DoseLog.objects.select_related(
        "medication",
        "medication__patient",
    )

    logs = _filter_dose_logs(
        logs,
        start_date,
        end_date,
    ).order_by(
        "scheduled_date",
        "scheduled_time",
    )

    grouped = {}

    for log in logs:
        iso = log.scheduled_date.isocalendar()
        key = f"{iso.year}-W{iso.week:02d}"

        if key not in grouped:
            grouped[key] = {
                "scheduled": 0,
                "taken": 0,
                "missed": 0,
            }

        grouped[key]["scheduled"] += 1

        if log.status == "taken":
            grouped[key]["taken"] += 1
        elif log.status == "missed":
            grouped[key]["missed"] += 1

    headers = [
        "Week",
        "Scheduled Doses",
        "Taken",
        "Missed",
        "Adherence %",
    ]

    rows = []

    for week, item in sorted(grouped.items()):
        completed = item["taken"] + item["missed"]

        adherence = (
            (item["taken"] / completed) * 100
            if completed
            else 0
        )

        rows.append(
            [
                week,
                item["scheduled"],
                item["taken"],
                item["missed"],
                _safe_percentage(adherence),
            ]
        )

    return headers, rows


def _build_monthly_report(start_date, end_date):
    logs = DoseLog.objects.select_related(
        "medication",
        "medication__patient",
    )

    logs = _filter_dose_logs(
        logs,
        start_date,
        end_date,
    ).order_by(
        "scheduled_date",
        "scheduled_time",
    )

    grouped = {}

    for log in logs:
        key = log.scheduled_date.strftime("%Y-%m")

        if key not in grouped:
            grouped[key] = {
                "scheduled": 0,
                "taken": 0,
                "missed": 0,
            }

        grouped[key]["scheduled"] += 1

        if log.status == "taken":
            grouped[key]["taken"] += 1
        elif log.status == "missed":
            grouped[key]["missed"] += 1

    headers = [
        "Month",
        "Scheduled Doses",
        "Taken",
        "Missed",
        "Adherence %",
    ]

    rows = []

    for month, item in sorted(grouped.items()):
        completed = item["taken"] + item["missed"]

        adherence = (
            (item["taken"] / completed) * 100
            if completed
            else 0
        )

        rows.append(
            [
                month,
                item["scheduled"],
                item["taken"],
                item["missed"],
                _safe_percentage(adherence),
            ]
        )

    return headers, rows


def _build_report(report_type, start_date, end_date):
    builders = {
        "patient": _build_patient_report,
        "medicine": _build_medicine_report,
        "adherence": _build_adherence_report,
        "missed_dose": _build_missed_dose_report,
        "caregiver": _build_caregiver_report,
        "refill": _build_refill_report,
        "system_usage": _build_system_usage_report,
        "notification": _build_notification_report,
        "weekly": _build_weekly_report,
        "monthly": _build_monthly_report,
    }

    builder = builders.get(report_type)

    if not builder:
        raise ValueError(
            f"Unsupported report type: {report_type}"
        )

    return builder(start_date, end_date)


def _csv_response(report_type, headers, rows):
    import csv

    response = HttpResponse(
        content_type="text/csv; charset=utf-8"
    )

    response[
        "Content-Disposition"
    ] = (
        f'attachment; filename="pillsync_{report_type}_report.csv"'
    )

    writer = csv.writer(response)
    writer.writerow(headers)

    for row in rows:
        writer.writerow(row)

    return response


def _xlsx_response(report_type, headers, rows):
    try:
        from openpyxl import Workbook
    except ImportError:
        return HttpResponse(
            "Excel export requires openpyxl. "
            "Run: pip install openpyxl",
            status=500,
            content_type="text/plain",
        )

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Report"

    worksheet.append(headers)

    for row in rows:
        worksheet.append(row)

    for column in worksheet.columns:
        max_length = 0
        column_letter = column[0].column_letter

        for cell in column:
            value = "" if cell.value is None else str(cell.value)
            max_length = max(max_length, len(value))

        worksheet.column_dimensions[
            column_letter
        ].width = min(max_length + 2, 40)

    from io import BytesIO

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    response = HttpResponse(
        output.getvalue(),
        content_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
    )

    response[
        "Content-Disposition"
    ] = (
        f'attachment; filename="pillsync_{report_type}_report.xlsx"'
    )

    return response


def _pdf_response(report_type, headers, rows):
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import (
            SimpleDocTemplate,
            Table,
            TableStyle,
            Paragraph,
            Spacer,
        )
    except ImportError:
        return HttpResponse(
            "PDF export requires reportlab. "
            "Run: pip install reportlab",
            status=500,
            content_type="text/plain",
        )

    from io import BytesIO

    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        rightMargin=20,
        leftMargin=20,
        topMargin=20,
        bottomMargin=20,
    )

    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph(
        f"PillSync - {report_type.replace('_', ' ').title()} Report",
        styles["Title"],
    )

    elements.append(title)
    elements.append(Spacer(1, 12))

    table_data = [headers] + rows

    table = Table(
        table_data,
        repeatRows=1,
    )

    table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.HexColor("#0f9488"),
                ),
                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white,
                ),
                (
                    "FONTNAME",
                    (0, 0),
                    (-1, 0),
                    "Helvetica-Bold",
                ),
                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey,
                ),
                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    7,
                ),
                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),
            ]
        )
    )

    elements.append(table)

    document.build(elements)

    response = HttpResponse(
        output.getvalue(),
        content_type="application/pdf",
    )

    response[
        "Content-Disposition"
    ] = (
        f'attachment; filename="pillsync_{report_type}_report.pdf"'
    )

    return response


class AdminReportTypesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        return Response(
            {
                "report_types": REPORT_TYPES,
            }
        )


class AdminReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_type):
        _require_admin(request.user)

        if report_type not in REPORT_TYPES:
            return Response(
                {
                    "detail": "Invalid report type."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            start_date, end_date = _parse_dates(request)

            headers, rows = _build_report(
                report_type,
                start_date,
                end_date,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "report_type": report_type,
                "start_date": (
                    _format_date(start_date)
                    if start_date
                    else None
                ),
                "end_date": (
                    _format_date(end_date)
                    if end_date
                    else None
                ),
                "headers": headers,
                "rows": rows,
            }
        )


class AdminReportExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_type):
        _require_admin(request.user)

        if report_type not in REPORT_TYPES:
            return Response(
                {
                    "detail": "Invalid report type."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        export_format = (
            request.query_params.get(
                "format",
                "csv",
            )
            .lower()
            .strip()
        )

        if export_format not in {
            "csv",
            "xlsx",
            "pdf",
        }:
            return Response(
                {
                    "detail": (
                        "format must be csv, xlsx, or pdf."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date, end_date = _parse_dates(request)

            headers, rows = _build_report(
                report_type,
                start_date,
                end_date,
            )

        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if export_format == "csv":
            return _csv_response(
                report_type,
                headers,
                rows,
            )

        if export_format == "xlsx":
            return _xlsx_response(
                report_type,
                headers,
                rows,
            )

        return _pdf_response(
            report_type,
            headers,
            rows,
        )