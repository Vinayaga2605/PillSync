from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Medication, Refill
from .serializers import MedicationSerializer
from apps.adherence.models import DoseLog


class MedicationViewSet(viewsets.ModelViewSet):
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Medication.objects.filter(
            patient=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        medication = self.get_object()

        logs = DoseLog.objects.filter(
            medication=medication
        ).order_by("-scheduled_date", "-scheduled_time")[:30]

        data = [
            {
                "id": log.id,
                "date": log.scheduled_date.strftime("%b %d, %Y"),
                "time": log.scheduled_time.strftime("%I:%M %p"),
                "status": log.status,
            }
            for log in logs
        ]

        return Response(data)

    @action(detail=True, methods=["post"])
    def refill(self, request, pk=None):
        medication = self.get_object()

        try:
            quantity = int(request.data.get("quantity", 0))
        except (TypeError, ValueError):
            return Response(
                {"detail": "Quantity must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity <= 0:
            return Response(
                {"detail": "Refill quantity must be greater than 0."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refill = Refill.objects.create(
            medication=medication,
            quantity=quantity,
        )

        medication.remaining_stock += quantity
        medication.total_stock += quantity
        medication.save(
            update_fields=["remaining_stock", "total_stock"]
        )

        return Response(
            {
                "message": "Medicine refilled successfully.",
                "refill": {
                    "id": refill.id,
                    "quantity": refill.quantity,
                    "refill_date": refill.refill_date,
                },
                "medicine": {
                    "id": medication.id,
                    "name": medication.name,
                    "total_stock": medication.total_stock,
                    "remaining_stock": medication.remaining_stock,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        meds = self.get_queryset()

        alerts = []

        for m in meds:
            daily_dose = m.doses_per_day or 1
            threshold = daily_dose * 5

            if m.remaining_stock <= threshold:
                days_remaining = m.remaining_stock // daily_dose

                alerts.append(
                    {
                        "id": m.id,
                        "medicineName": m.name,
                        "daysRemaining": days_remaining,
                    }
                )

        return Response(alerts)