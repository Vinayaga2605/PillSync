from datetime import date, timedelta
from collections import defaultdict

from django.db.models import Count
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response

from apps.medications.models import Medication
from apps.adherence.models import DoseLog
from apps.notifications.models import NotificationLog
from apps.reminders.models import Reminder
from apps.users.models import User

from .permissions import IsPatient


def _doses_qs(user):
    return DoseLog.objects.filter(
        medication__patient=user
    )


class AdherenceTrendView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        today = date.today()
        start = today - timedelta(days=6)

        logs = _doses_qs(request.user).filter(
            scheduled_date__gte=start,
            scheduled_date__lte=today,
        )

        by_day = defaultdict(
            lambda: {
                "total": 0,
                "taken": 0,
            }
        )

        for log in logs:
            by_day[log.scheduled_date]["total"] += 1

            if log.status == DoseLog.Status.TAKEN:
                by_day[log.scheduled_date]["taken"] += 1

        data = []

        for i in range(7):
            d = start + timedelta(days=i)

            stats = by_day.get(
                d,
                {
                    "total": 0,
                    "taken": 0,
                }
            )

            pct = (
                round(
                    (stats["taken"] / stats["total"]) * 100
                )
                if stats["total"]
                else 0
            )

            data.append({
                "day": d.strftime("%a"),
                "date": d.strftime("%Y-%m-%d"),
                "adherence": pct,
                "taken": stats["taken"],
                "total": stats["total"],
            })

        return Response(data)


class MissedByMedicineView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        meds = Medication.objects.filter(
            patient=request.user
        ).order_by("name")

        data = []

        for med in meds:
            total = med.dose_logs.count()

            missed = med.dose_logs.filter(
                status=DoseLog.Status.MISSED
            ).count()

            data.append({
                "medicine": med.name,
                "missed": missed,
                "total": total,
            })

        return Response(data)


class AdherenceByMedicineView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        meds = Medication.objects.filter(
            patient=request.user
        ).order_by("name")

        data = []

        for med in meds:
            total = med.dose_logs.count()

            taken = med.dose_logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            missed = med.dose_logs.filter(
                status=DoseLog.Status.MISSED
            ).count()

            pending = med.dose_logs.filter(
                status=DoseLog.Status.PENDING
            ).count()

            pct = (
                round((taken / total) * 100)
                if total
                else 0
            )

            data.append({
                "medicine": med.name,
                "adherence": pct,
                "taken": taken,
                "missed": missed,
                "pending": pending,
                "total": total,
            })

        return Response(data)


class RefillStatsView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        meds = Medication.objects.filter(
            patient=request.user
        ).prefetch_related(
            "refills"
        ).order_by("name")

        today = date.today()
        month_start = today.replace(day=1)

        data = []

        for med in meds:
            refills = list(
                med.refills.order_by(
                    "refill_date",
                    "id"
                )
            )

            refills_this_month = [
                refill
                for refill in refills
                if (
                    refill.refill_date >= month_start
                    and refill.refill_date <= today
                )
            ]

            intervals = []

            for i in range(1, len(refills)):
                previous_date = (
                    refills[i - 1].refill_date
                )

                current_date = (
                    refills[i].refill_date
                )

                days = (
                    current_date - previous_date
                ).days

                if days > 0:
                    intervals.append(days)

            avg_days_between = (
                round(
                    sum(intervals) / len(intervals)
                )
                if intervals
                else 0
            )

            data.append({
                "medicine": med.name,
                "refillsThisMonth": len(
                    refills_this_month
                ),
                "totalRefills": len(refills),
                "avgDaysBetween": avg_days_between,
                "remainingStock": med.remaining_stock,
                "totalStock": med.total_stock,
            })

        return Response(data)


def _report(
    user,
    start_date,
    end_date,
    period_label,
):
    logs = _doses_qs(user).filter(
        scheduled_date__gte=start_date,
        scheduled_date__lte=end_date,
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

    rate = (
        round((taken / total) * 100)
        if total
        else 0
    )

    return {
        "period": period_label,
        "totalDoses": total,
        "taken": taken,
        "missed": missed,
        "pending": pending,
        "adherenceRate": rate,
    }


class WeeklyReportView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        today = date.today()
        start = today - timedelta(days=6)

        label = (
            f"{start.strftime('%b %d')} - "
            f"{today.strftime('%b %d, %Y')}"
        )

        return Response(
            _report(
                request.user,
                start,
                today,
                label,
            )
        )


class MonthlyReportView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        today = date.today()
        start = today.replace(day=1)

        return Response(
            _report(
                request.user,
                start,
                today,
                today.strftime("%B %Y"),
            )
        )


class ConsistencyView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        today = date.today()
        start = today - timedelta(days=29)

        logs = _doses_qs(request.user).filter(
            scheduled_date__gte=start,
            scheduled_date__lte=today,
        )

        by_day = defaultdict(
            lambda: {
                "total": 0,
                "taken": 0,
            }
        )

        for log in logs:
            by_day[log.scheduled_date]["total"] += 1

            if log.status == DoseLog.Status.TAKEN:
                by_day[log.scheduled_date]["taken"] += 1

        last_30 = []

        for i in range(30):
            d = start + timedelta(days=i)

            stats = by_day.get(
                d,
                {
                    "total": 0,
                    "taken": 0,
                }
            )

            if stats["total"] == 0:
                value = 0
            else:
                ratio = (
                    stats["taken"]
                    / stats["total"]
                )

                if ratio == 1:
                    value = 1
                elif ratio > 0:
                    value = 0.5
                else:
                    value = 0

            last_30.append({
                "date": d.strftime("%Y-%m-%d"),
                "day": d.strftime("%b %d"),
                "value": value,
                "percentage": round(
                    value * 100
                ),
            })

        return Response({
            "last30Days": last_30
        })


class AdminAnalyticsView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required."},
                status=401,
            )

        if request.user.role != User.Role.ADMIN:
            return Response(
                {"detail": "Admin access required."},
                status=403,
            )

        today = timezone.localdate()
        seven_days_ago = today - timedelta(days=6)
        thirty_days_ago = today - timedelta(days=29)

        patients = User.objects.filter(
            role=User.Role.PATIENT
        )

        medicines = Medication.objects.all()

        dose_logs = DoseLog.objects.filter(
            scheduled_date__gte=thirty_days_ago,
            scheduled_date__lte=today,
        )

        total_doses = dose_logs.count()

        taken_doses = dose_logs.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        missed_doses = dose_logs.filter(
            status=DoseLog.Status.MISSED
        ).count()

        overall_adherence = (
            round(
                (taken_doses / total_doses) * 100
            )
            if total_doses
            else 0
        )

        today_logs = DoseLog.objects.filter(
            scheduled_date=today
        )

        taken_today = today_logs.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        schedules = Reminder.objects.count()

    

        daily_map = defaultdict(
            lambda: {
                "total": 0,
                "taken": 0,
            }
        )

        for log in dose_logs:
            daily_map[
                log.scheduled_date
            ]["total"] += 1

            if log.status == DoseLog.Status.TAKEN:
                daily_map[
                    log.scheduled_date
                ]["taken"] += 1

        adherence_daily = []

        for i in range(30):
            current_date = (
                thirty_days_ago
                + timedelta(days=i)
            )

            values = daily_map.get(
                current_date,
                {
                    "total": 0,
                    "taken": 0,
                }
            )

            total = values["total"]
            taken = values["taken"]

            adherence = (
                round((taken / total) * 100)
                if total
                else 0
            )

            adherence_daily.append({
                "label": current_date.strftime(
                    "%b %d"
                ),
                "date": current_date.strftime(
                    "%Y-%m-%d"
                ),
                "adherence": adherence,
            })

 

        adherence_weekly = []

        for week_index in range(4):
            week_start = (
                today
                - timedelta(
                    days=27 - (week_index * 7)
                )
            )

            week_end = week_start + timedelta(
                days=6
            )

            if week_end > today:
                week_end = today

            week_logs = dose_logs.filter(
                scheduled_date__gte=week_start,
                scheduled_date__lte=week_end,
            )

            week_total = week_logs.count()

            week_taken = week_logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            week_adherence = (
                round(
                    (week_taken / week_total) * 100
                )
                if week_total
                else 0
            )

            adherence_weekly.append({
                "label": (
                    f"{week_start.strftime('%b %d')}"
                    f" - "
                    f"{week_end.strftime('%b %d')}"
                ),
                "adherence": week_adherence,
            })


        adherence_monthly = []

        for month_offset in range(6):
            month_end = today

            first_day = (
                today.replace(day=1)
                - timedelta(days=month_offset * 30)
            )

            first_day = first_day.replace(day=1)

            if month_offset == 0:
                month_start = first_day
            else:
                month_start = first_day

            if month_start > month_end:
                continue

            month_logs = DoseLog.objects.filter(
                scheduled_date__gte=month_start,
                scheduled_date__lte=month_end,
            )

            month_total = month_logs.count()

            month_taken = month_logs.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            month_adherence = (
                round(
                    (month_taken / month_total) * 100
                )
                if month_total
                else 0
            )

            adherence_monthly.append({
                "label": month_start.strftime(
                    "%b %Y"
                ),
                "adherence": month_adherence,
            })

        adherence_monthly.reverse()

  

        medicine_usage = []

        medicine_counts = (
            medicines
            .annotate(
                use_count=Count(
                    "dose_logs"
                )
            )
            .order_by("-use_count", "name")[:8]
        )

        for medication in medicine_counts:
            medicine_usage.append({
                "medicine": medication.name,
                "uses": medication.use_count,
            })


        notification_trend = []

        notification_logs = (
            NotificationLog.objects.filter(
                created_at__date__gte=seven_days_ago,
                created_at__date__lte=today,
            )
        )

        notification_map = defaultdict(
            lambda: {
                "sent": 0,
                "failed": 0,
            }
        )

        for log in notification_logs:
            current_date = (
                timezone.localtime(
                    log.created_at
                ).date()
            )

            if log.status.lower() == "failed":
                notification_map[
                    current_date
                ]["failed"] += 1
            else:
                notification_map[
                    current_date
                ]["sent"] += 1

        for i in range(7):
            current_date = (
                seven_days_ago
                + timedelta(days=i)
            )

            values = notification_map.get(
                current_date,
                {
                    "sent": 0,
                    "failed": 0,
                }
            )

            notification_trend.append({
                "label": current_date.strftime(
                    "%b %d"
                ),
                "sent": values["sent"],
                "failed": values["failed"],
            })

        missed_dose_trend = []

        missed_map = defaultdict(int)

        missed_logs = dose_logs.filter(
            status=DoseLog.Status.MISSED
        )

        for log in missed_logs:
            missed_map[
                log.scheduled_date
            ] += 1

        for i in range(30):
            current_date = (
                thirty_days_ago
                + timedelta(days=i)
            )

            missed_dose_trend.append({
                "label": current_date.strftime(
                    "%b %d"
                ),
                "missed": missed_map.get(
                    current_date,
                    0
                ),
            })

        refill_prediction_trend = []

        for i in range(7):
            current_date = (
                today
                + timedelta(days=i)
            )

            prediction_count = 0
            critical_count = 0

            for medication in medicines:
                daily_doses = (
                    medication.doses_per_day
                    or 1
                )

                remaining = (
                    medication.remaining_stock
                    or 0
                )

                remaining_days = (
                    remaining
                    // daily_doses
                )

                if remaining_days <= i:
                    prediction_count += 1

                if (
                    i == 0
                    and remaining_days <= 3
                ):
                    critical_count += 1

            refill_prediction_trend.append({
                "label": current_date.strftime(
                    "%b %d"
                ),
                "predictions": prediction_count,
                "critical": critical_count,
            })

     
        reminder_success_rate = []

        for i in range(7):
            current_date = (
                seven_days_ago
                + timedelta(days=i)
            )

            day_reminders = DoseLog.objects.filter(
                scheduled_date=current_date
            )

            total = day_reminders.count()

            taken = day_reminders.filter(
                status=DoseLog.Status.TAKEN
            ).count()

            success_rate = (
                round((taken / total) * 100)
                if total
                else 0
            )

            reminder_success_rate.append({
                "label": current_date.strftime(
                    "%b %d"
                ),
                "success_rate": success_rate,
            })



        disease_counts = defaultdict(int)

        for medication in medicines:
            condition = (
                medication.condition
                or "General"
            )

            disease_counts[condition] += 1

        patients_by_disease = [
            {
                "disease": disease,
                "patients": count,
            }
            for disease, count
            in sorted(
                disease_counts.items(),
                key=lambda item: item[1],
                reverse=True,
            )
        ]

        notification_count = (
            NotificationLog.objects.count()
        )

        return Response({
            "users": User.objects.count(),
            "patients": patients.count(),
            "caregivers": User.objects.filter(
                role=User.Role.CAREGIVER
            ).count(),
            "admins": User.objects.filter(
                role=User.Role.ADMIN
            ).count(),
            "medicines": medicines.count(),
            "schedules": schedules,
            "taken_today": taken_today,

            "overall_adherence": overall_adherence,
            "overallAdherence": overall_adherence,

            "notification_count": notification_count,

            "adherence_daily": adherence_daily,
            "adherence_weekly": adherence_weekly,
            "adherence_monthly": adherence_monthly,
            "medicine_usage": medicine_usage,
            "notification_trend": notification_trend,
            "missed_dose_trend": missed_dose_trend,
            "refill_prediction_trend": (
                refill_prediction_trend
            ),
            "reminder_success_rate": (
                reminder_success_rate
            ),
            "patients_by_disease": (
                patients_by_disease
            ),
        })