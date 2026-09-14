from datetime import timedelta

from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.medications.models import Medication


class RefillForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        medications = Medication.objects.filter(
            patient=request.user
        ).order_by("name")

        data = []

        for medication in medications:
            daily_doses = medication.doses_per_day or 1
            remaining_stock = medication.remaining_stock or 0

            days_remaining = (
                remaining_stock // daily_doses
            )

            if days_remaining <= 3:
                status_value = "critical"
            elif days_remaining <= 7:
                status_value = "low"
            else:
                status_value = "sufficient"

            recommended_quantity = max(
                (daily_doses * 30) - remaining_stock,
                0,
            )

            data.append(
                {
                    "medicationId": medication.id,
                    "medicineName": medication.name,
                    "dosage": medication.dosage,
                    "remainingStock": remaining_stock,
                    "totalStock": medication.total_stock,
                    "dosesPerDay": daily_doses,
                    "daysRemaining": days_remaining,
                    "dailyRequirement": daily_doses,
                    "recommendedRefillQuantity": (
                        recommended_quantity
                    ),
                    "status": status_value,
                }
            )

        return Response(data)


class AdminRefillForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "admin":
            return Response(
                {"detail": "Admin access required."},
                status=403,
            )

        medications = (
            Medication.objects
            .select_related("patient")
            .order_by("name", "patient__username")
        )

        data = []

        for medication in medications:
            daily_consumption = (
                medication.doses_per_day or 1
            )

            available_qty = (
                medication.remaining_stock or 0
            )

            reorder_level = daily_consumption * 7

            remaining_days = (
                available_qty // daily_consumption
            )

            if remaining_days <= 3:
                status_value = "critical"
            elif remaining_days <= 7:
                status_value = "warning"
            else:
                status_value = "healthy"

            predicted_date = (
                timezone.localdate()
                + timedelta(days=remaining_days)
            )

            data.append(
                {
                    "id": medication.id,
                    "medicine_id": medication.id,
                    "medicine_name": medication.name,
                    "medicineName": medication.name,
                    "brand": None,
                    "category": medication.condition or "General",
                    "available_qty": available_qty,
                    "availableQty": available_qty,
                    "daily_consumption": daily_consumption,
                    "dailyConsumption": daily_consumption,
                    "reorder_level": reorder_level,
                    "reorderLevel": reorder_level,
                    "remaining_days": remaining_days,
                    "predicted_refill_date": (
                        predicted_date.strftime("%Y-%m-%d")
                    ),
                    "predictedRefillDate": (
                        predicted_date.strftime("%Y-%m-%d")
                    ),
                    "status": status_value,
                    "patient_id": medication.patient_id,
                    "patient_name": (
                        medication.patient.get_full_name()
                        or medication.patient.username
                    ),
                    "dosage": medication.dosage,
                    "frequency": medication.frequency,
                    "total_stock": medication.total_stock,
                }
            )

        return Response(data)