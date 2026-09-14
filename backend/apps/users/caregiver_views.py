from datetime import date, timedelta

from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import User, CaregiverAssignment
from apps.medications.models import Medication
from apps.adherence.models import DoseLog


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _patient_name(patient):
    return patient.get_full_name() or patient.username


def _patient_age(patient):
    if not patient.date_of_birth:
        return "-"

    today = date.today()

    return (
        today.year
        - patient.date_of_birth.year
        - (
            (today.month, today.day)
            < (
                patient.date_of_birth.month,
                patient.date_of_birth.day,
            )
        )
    )


def _patient_dose_stats(patient):
    logs = DoseLog.objects.filter(
        medication__patient=patient
    )

    total = logs.count()

    taken = logs.filter(
        status=DoseLog.Status.TAKEN
    ).count()

    missed = logs.filter(
        status=DoseLog.Status.MISSED
    ).count()

    pending = logs.filter(
        status=DoseLog.Status.PENDING
    ).count()

    adherence = (
        round((taken / total) * 100)
        if total
        else 0
    )

    return {
        "total": total,
        "taken": taken,
        "missed": missed,
        "pending": pending,
        "adherence": adherence,
    }


def _patient_conditions(patient):
    conditions = (
        Medication.objects
        .filter(patient=patient)
        .exclude(condition="")
        .values_list("condition", flat=True)
        .distinct()
    )

    return ", ".join(conditions) or "-"


def _patient_summary(patient):
    stats = _patient_dose_stats(patient)

    medication_count = Medication.objects.filter(
        patient=patient
    ).count()

    return {
        "id": patient.id,
        "name": _patient_name(patient),
        "username": patient.username,
        "email": patient.email,
        "age": _patient_age(patient),
        "condition": _patient_conditions(patient),
        "medicines": medication_count,
        "medicationCount": medication_count,
        "adherencePercentage": stats["adherence"],
        "dosesTaken": stats["taken"],
        "dosesMissed": stats["missed"],
        "pendingDoses": stats["pending"],
    }


def _assigned_patient_ids(caregiver):
    return CaregiverAssignment.objects.filter(
        caregiver=caregiver
    ).values_list(
        "patient_id",
        flat=True,
    )


# ============================================================
# AVAILABLE CAREGIVERS
# ============================================================

class AvailableCaregiversView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        caregivers = (
            User.objects
            .filter(
                role=User.Role.CAREGIVER,
                is_active=True,
            )
            .values(
                "id",
                "username",
                "email",
                "first_name",
                "last_name",
            )
        )

        data = []

        for caregiver in caregivers:
            full_name = (
                f"{caregiver['first_name']} "
                f"{caregiver['last_name']}"
            ).strip()

            data.append({
                "id": caregiver["id"],
                "user_id": caregiver["id"],
                "username": caregiver["username"],
                "email": caregiver["email"],
                "full_name": (
                    full_name
                    or caregiver["username"]
                ),
            })

        return Response(data)


# ============================================================
# CAREGIVER DASHBOARD
# ============================================================

class CaregiverDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = _assigned_patient_ids(request.user)

        patients = User.objects.filter(
            id__in=patient_ids
        )

        total_patients = patients.count()

        all_logs = DoseLog.objects.filter(
            medication__patient_id__in=patient_ids
        )

        total_doses = all_logs.count()

        taken_doses = all_logs.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        missed_doses = all_logs.filter(
            status=DoseLog.Status.MISSED
        ).count()

        adherence = (
            round((taken_doses / total_doses) * 100)
            if total_doses
            else 0
        )

        medications = Medication.objects.filter(
            patient_id__in=patient_ids
        )

        low_stock = medications.filter(
            remaining_stock__lte=5
        ).count()

        critical_stock = medications.filter(
            remaining_stock__lte=2
        ).count()

        patient_data = [
            _patient_summary(patient)
            for patient in patients
        ]

        missed_logs = (
            DoseLog.objects
            .filter(
                medication__patient_id__in=patient_ids,
                status=DoseLog.Status.MISSED,
            )
            .select_related(
                "medication",
                "medication__patient",
            )
            .order_by(
                "-scheduled_date",
                "-scheduled_time",
            )[:5]
        )

        alerts = []

        for log in missed_logs:
            alerts.append({
                "id": log.id,
                "type": "danger",
                "title": "Missed Medication",
                "patientName": _patient_name(
                    log.medication.patient
                ),
                "medicineName": log.medication.name,
                "message": (
                    f"{_patient_name(log.medication.patient)} "
                    f"missed {log.medication.name}."
                ),
                "date": (
                    log.scheduled_date.strftime("%b %d")
                    if log.scheduled_date
                    else "-"
                ),
                "time": (
                    log.scheduled_time.strftime("%I:%M %p")
                    if log.scheduled_time
                    else "-"
                ),
            })

        low_stock_medicines = (
            medications
            .filter(remaining_stock__lte=5)
            .select_related("patient")[:5]
        )

        for medication in low_stock_medicines:
            alerts.append({
                "id": f"stock-{medication.id}",
                "type": (
                    "danger"
                    if medication.remaining_stock <= 2
                    else "warning"
                ),
                "title": "Low Medicine Stock",
                "patientName": _patient_name(
                    medication.patient
                ),
                "medicineName": medication.name,
                "message": (
                    f"{medication.name} has only "
                    f"{medication.remaining_stock} doses remaining."
                ),
                "date": "-",
                "time": "-",
            })

        return Response({
            "totalPatients": total_patients,
            "averageAdherence": adherence,
            "missedDoses": missed_doses,
            "refillAlerts": low_stock,
            "criticalRefills": critical_stock,
            "patients": patient_data,
            "alerts": alerts[:10],
        })


# ============================================================
# CAREGIVER PATIENTS
# ============================================================

class CaregiverPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assignments = (
            CaregiverAssignment.objects
            .filter(caregiver=request.user)
            .select_related("patient")
        )

        return Response([
            _patient_summary(a.patient)
            for a in assignments
        ])


# ============================================================
# CAREGIVER PATIENT DETAIL
# ============================================================

class CaregiverPatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        assignment = get_object_or_404(
            CaregiverAssignment,
            caregiver=request.user,
            patient_id=patient_id,
        )

        patient = assignment.patient

        stats = _patient_dose_stats(patient)

        medications = [
            {
                "id": medication.id,
                "name": medication.name,
                "dosage": medication.dosage,
                "frequency": medication.frequency,
                "dosesPerDay": medication.doses_per_day,
                "remainingStock": medication.remaining_stock,
                "totalStock": medication.total_stock,
                "condition": medication.condition,
            }
            for medication in Medication.objects.filter(
                patient=patient
            )
        ]

        missed_logs = (
            DoseLog.objects
            .filter(
                medication__patient=patient,
                status=DoseLog.Status.MISSED,
            )
            .select_related("medication")
            .order_by(
                "-scheduled_date",
                "-scheduled_time",
            )[:10]
        )

        recent_missed = [
            {
                "id": log.id,
                "medicineName": log.medication.name,
                "date": (
                    log.scheduled_date.strftime("%b %d")
                    if log.scheduled_date
                    else "-"
                ),
                "time": (
                    log.scheduled_time.strftime("%I:%M %p")
                    if log.scheduled_time
                    else "-"
                ),
            }
            for log in missed_logs
        ]

        return Response({
            "id": patient.id,
            "name": _patient_name(patient),
            "username": patient.username,
            "email": patient.email,
            "age": _patient_age(patient),
            "condition": _patient_conditions(patient),
            "adherencePercentage": stats["adherence"],
            "dosesTaken": stats["taken"],
            "dosesMissed": stats["missed"],
            "pendingDoses": stats["pending"],
            "totalDoses": stats["total"],
            "medications": medications,
            "recentMissedDoses": recent_missed,
        })


# ============================================================
# MEDICATION MONITORING
# ============================================================

class CaregiverMedicationMonitoringView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = _assigned_patient_ids(request.user)

        medications = (
            Medication.objects
            .filter(patient_id__in=patient_ids)
            .select_related("patient")
            .order_by("patient__first_name", "name")
        )

        data = []

        for medication in medications:
            patient = medication.patient

            logs = DoseLog.objects.filter(
                medication=medication
            )

            total = logs.count()

            taken = logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            missed = logs.filter(
                status=DoseLog.Status.MISSED
            ).count()

            adherence = (
                round((taken / total) * 100)
                if total
                else 0
            )

            latest_log = (
                logs.order_by(
                    "-scheduled_date",
                    "-scheduled_time",
                )
                .first()
            )

            if latest_log:
                if latest_log.status == DoseLog.Status.TAKEN:
                    status = "Taken"
                elif latest_log.status == DoseLog.Status.MISSED:
                    status = "Missed"
                else:
                    status = "Pending"
            else:
                status = "Pending"

            if medication.remaining_stock <= 5:
                stock_status = "Low Stock"
            else:
                stock_status = "Available"

            data.append({
                "id": medication.id,
                "patientId": patient.id,
                "patient": _patient_name(patient),
                "patientName": _patient_name(patient),
                "medicine": medication.name,
                "medicineName": medication.name,
                "dosage": medication.dosage,
                "frequency": medication.frequency,
                "schedule": medication.frequency,
                "adherence": adherence,
                "dosesTaken": taken,
                "dosesMissed": missed,
                "stock": medication.remaining_stock,
                "remainingStock": medication.remaining_stock,
                "totalStock": medication.total_stock,
                "status": (
                    stock_status
                    if medication.remaining_stock <= 5
                    else status
                ),
            })

        return Response(data)


# ============================================================
# PATIENT ANALYTICS
# ============================================================

class CaregiverPatientAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = _assigned_patient_ids(request.user)

        requested_patient = request.query_params.get(
            "patient_id"
        )

        if requested_patient:
            patient = get_object_or_404(
                User,
                id=requested_patient,
                id__in=patient_ids,
            )
        else:
            patient = (
                User.objects
                .filter(id__in=patient_ids)
                .first()
            )

        if not patient:
            return Response({
                "patient": None,
                "message": "No assigned patients found.",
            })

        stats = _patient_dose_stats(patient)

        # ----------------------------------------------------
        # LAST 7 DAYS ADHERENCE
        # ----------------------------------------------------

        start_date = date.today() - timedelta(days=6)

        trend = []

        for offset in range(7):
            current_date = (
                start_date
                + timedelta(days=offset)
            )

            logs = DoseLog.objects.filter(
                medication__patient=patient,
                scheduled_date=current_date,
            )

            total = logs.count()

            taken = logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            missed = logs.filter(
                status=DoseLog.Status.MISSED
            ).count()

            pending = logs.filter(
                status=DoseLog.Status.PENDING
            ).count()

            adherence = (
                round((taken / total) * 100)
                if total
                else 0
            )

            trend.append({
                "date": current_date.strftime(
                    "%Y-%m-%d"
                ),
                "day": current_date.strftime(
                    "%a"
                ),
                "label": current_date.strftime(
                    "%a"
                ),
                "adherence": adherence,
                "taken": taken,
                "missed": missed,
                "pending": pending,
                "total": total,
            })

        # ----------------------------------------------------
        # MEDICINE-LEVEL ANALYTICS
        # ----------------------------------------------------

        medications = Medication.objects.filter(
            patient=patient
        ).order_by("name")

        medicine_data = []

        for medication in medications:
            logs = DoseLog.objects.filter(
                medication=medication
            )

            total = logs.count()

            taken = logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            missed = logs.filter(
                status=DoseLog.Status.MISSED
            ).count()

            pending = logs.filter(
                status=DoseLog.Status.PENDING
            ).count()

            adherence = (
                round((taken / total) * 100)
                if total
                else 0
            )

            daily_requirement = (
                medication.doses_per_day or 1
            )

            remaining_stock = (
                medication.remaining_stock or 0
            )

            days_remaining = (
                round(
                    remaining_stock
                    / daily_requirement
                )
                if daily_requirement > 0
                else 0
            )

            if days_remaining <= 2:
                stock_status = "Critical"
            elif days_remaining <= 5:
                stock_status = "Low Stock"
            else:
                stock_status = "Good"

            medicine_data.append({
                "id": medication.id,
                "medicine": medication.name,
                "medicineName": medication.name,
                "name": medication.name,
                "adherence": adherence,
                "adherencePercentage": adherence,
                "taken": taken,
                "dosesTaken": taken,
                "missed": missed,
                "dosesMissed": missed,
                "pending": pending,
                "dosesPending": pending,
                "total": total,
                "totalDoses": total,
                "remainingStock": remaining_stock,
                "stock": remaining_stock,
                "totalStock": medication.total_stock,
                "dailyRequirement": daily_requirement,
                "daysRemaining": days_remaining,
                "stockDays": days_remaining,
                "refillDays": days_remaining,
                "status": stock_status,
            })

        # ----------------------------------------------------
        # REFILL STATUS
        # ----------------------------------------------------

        refill_data = []

        for medication in medications:
            daily_requirement = (
                medication.doses_per_day or 1
            )

            remaining_stock = (
                medication.remaining_stock or 0
            )

            days_remaining = (
                round(
                    remaining_stock
                    / daily_requirement
                )
                if daily_requirement > 0
                else 0
            )

            if days_remaining <= 2:
                status = "critical"
            elif days_remaining <= 7:
                status = "low"
            else:
                status = "good"

            refill_data.append({
                "id": medication.id,
                "medicationId": medication.id,
                "medicine": medication.name,
                "medicineName": medication.name,
                "name": medication.name,
                "dosage": medication.dosage,
                "remainingStock": remaining_stock,
                "totalStock": medication.total_stock,
                "dailyRequirement": daily_requirement,
                "daysRemaining": days_remaining,
                "stockDays": days_remaining,
                "refillDays": days_remaining,
                "status": status,
            })

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return Response({
            "patient": {
                "id": patient.id,
                "name": _patient_name(patient),
                "age": _patient_age(patient),
                "condition": _patient_conditions(patient),
            },

            # Existing summary kept unchanged
            "summary": {
                "adherence": stats["adherence"],
                "taken": stats["taken"],
                "missed": stats["missed"],
                "pending": stats["pending"],
                "totalDoses": stats["total"],
            },

            # Added aliases expected by caregiver frontend
            "statistics": {
                "adherence": stats["adherence"],
                "taken": stats["taken"],
                "missed": stats["missed"],
                "pending": stats["pending"],
                "dosesTaken": stats["taken"],
                "dosesMissed": stats["missed"],
                "dosesPending": stats["pending"],
                "totalDoses": stats["total"],
            },

            "adherence": stats["adherence"],
            "adherencePercentage": stats["adherence"],
            "taken": stats["taken"],
            "dosesTaken": stats["taken"],
            "missed": stats["missed"],
            "dosesMissed": stats["missed"],
            "pending": stats["pending"],
            "dosesPending": stats["pending"],

            "weeklyAdherence": trend,
            "weekly_adherence": trend,

            "medicinePerformance": medicine_data,
            "medicine_performance": medicine_data,
            "medicationSummary": medicine_data,
            "medication_summary": medicine_data,
            "medications": medicine_data,

            "refillStatus": refill_data,
            "refill_status": refill_data,
        })


# ============================================================
# MISSED DOSE ALERTS
# ============================================================

class CaregiverMissedDoseAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = _assigned_patient_ids(request.user)

        cutoff = date.today() - timedelta(days=2)

        logs = (
            DoseLog.objects
            .filter(
                medication__patient_id__in=patient_ids,
                status=DoseLog.Status.MISSED,
                scheduled_date__gte=cutoff,
            )
            .select_related(
                "medication",
                "medication__patient",
            )
            .order_by(
                "-scheduled_date",
                "-scheduled_time",
            )[:20]
        )

        data = [
            {
                "id": log.id,
                "patientId": log.medication.patient.id,
                "patientName": _patient_name(
                    log.medication.patient
                ),
                "medicineName": log.medication.name,
                "time": (
                    f"{log.scheduled_time.strftime('%I:%M %p')} "
                    f"on {log.scheduled_date.strftime('%b %d')}"
                ),
                "type": "danger",
                "title": "Missed Medication",
                "message": (
                    f"{_patient_name(log.medication.patient)} "
                    f"missed {log.medication.name}."
                ),
                "status": "Unread",
            }
            for log in logs
        ]

        return Response(data)


# ============================================================
# CAREGIVER ALERTS
# ============================================================

class CaregiverAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = _assigned_patient_ids(request.user)

        alerts = []

        # -----------------------------------------------------
        # MISSED DOSES
        # -----------------------------------------------------

        cutoff = date.today() - timedelta(days=2)

        missed_logs = (
            DoseLog.objects
            .filter(
                medication__patient_id__in=patient_ids,
                status=DoseLog.Status.MISSED,
                scheduled_date__gte=cutoff,
            )
            .select_related(
                "medication",
                "medication__patient",
            )
            .order_by(
                "-scheduled_date",
                "-scheduled_time",
            )[:20]
        )

        for log in missed_logs:
            alerts.append({
                "id": f"missed-{log.id}",
                "patientId": log.medication.patient.id,
                "patientName": _patient_name(
                    log.medication.patient
                ),
                "medicineName": log.medication.name,
                "title": "Missed Medication",
                "message": (
                    f"{_patient_name(log.medication.patient)} "
                    f"missed {log.medication.name}."
                ),
                "time": (
                    log.scheduled_time.strftime("%I:%M %p")
                    if log.scheduled_time
                    else "-"
                ),
                "type": "danger",
                "status": "Unread",
            })

        # -----------------------------------------------------
        # LOW STOCK
        # -----------------------------------------------------

        medications = (
            Medication.objects
            .filter(
                patient_id__in=patient_ids,
                remaining_stock__lte=5,
            )
            .select_related("patient")
            .order_by("remaining_stock")[:20]
        )

        for medication in medications:
            status_type = (
                "danger"
                if medication.remaining_stock <= 2
                else "warning"
            )

            title = (
                "Critical Stock"
                if medication.remaining_stock <= 2
                else "Low Stock"
            )

            alerts.append({
                "id": f"stock-{medication.id}",
                "patientId": medication.patient.id,
                "patientName": _patient_name(
                    medication.patient
                ),
                "medicineName": medication.name,
                "title": title,
                "message": (
                    f"{medication.name} has only "
                    f"{medication.remaining_stock} doses remaining."
                ),
                "time": "Current",
                "type": status_type,
                "status": "Unread",
            })

        return Response(alerts[:30])