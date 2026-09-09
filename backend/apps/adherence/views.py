from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DoseLog


class DoseLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = DoseLog.objects.filter(
            medication__patient=request.user
        ).select_related("medication")

        data = [
            {
                "id": log.id,
                "medicationId": log.medication.id,
                "medicineName": log.medication.name,
                "date": log.scheduled_date,
                "time": log.scheduled_time,
                "status": log.status,
                "takenAt": log.taken_at,
            }
            for log in logs
        ]

        return Response(data)


class TakeDoseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, dose_id):
        dose = get_object_or_404(
            DoseLog,
            id=dose_id,
            medication__patient=request.user
        )

        if dose.status == DoseLog.Status.TAKEN:
            return Response(
                {"message": "Dose already marked as taken."},
                status=400
            )

        dose.status = DoseLog.Status.TAKEN
        dose.taken_at = timezone.now()
        dose.save(update_fields=["status", "taken_at"])

        # Reduce medicine stock
        medication = dose.medication

        if medication.remaining_stock > 0:
            medication.remaining_stock -= 1
            medication.save(update_fields=["remaining_stock"])

        return Response({
            "message": "Dose marked as taken.",
            "doseId": dose.id,
            "status": dose.status,
            "takenAt": dose.taken_at,
            "remainingStock": medication.remaining_stock,
        })


class MissDoseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, dose_id):
        dose = get_object_or_404(
            DoseLog,
            id=dose_id,
            medication__patient=request.user
        )

        if dose.status == DoseLog.Status.TAKEN:
            return Response(
                {"message": "A taken dose cannot be marked as missed."},
                status=400
            )

        dose.status = DoseLog.Status.MISSED
        dose.save(update_fields=["status"])

        return Response({
            "message": "Dose marked as missed.",
            "doseId": dose.id,
            "status": dose.status,
        })