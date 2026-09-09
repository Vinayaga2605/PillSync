from datetime import date, timedelta
from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response

from apps.medications.models import Medication
from apps.adherence.models import DoseLog

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
