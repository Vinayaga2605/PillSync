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

            days_remaining = remaining_stock // daily_doses

            if days_remaining <= 3:
                status_value = "critical"
            elif days_remaining <= 7:
                status_value = "low"
            else:
                status_value = "sufficient"

            recommended_quantity = max(
                (daily_doses * 30) - remaining_stock,
                0
            )

            data.append({
                "medicationId": medication.id,
                "medicineName": medication.name,
                "dosage": medication.dosage,
                "remainingStock": remaining_stock,
                "totalStock": medication.total_stock,
                "dosesPerDay": daily_doses,
                "daysRemaining": days_remaining,
                "dailyRequirement": daily_doses,
                "recommendedRefillQuantity": recommended_quantity,
                "status": status_value,
            })

        return Response(data)
