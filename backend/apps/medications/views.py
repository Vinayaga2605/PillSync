from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Medication, Refill, MedicineCatalog
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
            update_fields=[
                "remaining_stock",
                "total_stock",
            ]
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

        for medication in meds:
            daily_dose = medication.doses_per_day or 1
            threshold = daily_dose * 5

            if medication.remaining_stock <= threshold:
                days_remaining = (
                    medication.remaining_stock // daily_dose
                )

                alerts.append(
                    {
                        "id": medication.id,
                        "medicineName": medication.name,
                        "daysRemaining": days_remaining,
                    }
                )

        return Response(alerts)


class AdminMedicineCatalogView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _check_admin(self, request):
        if request.user.role != "admin":
            return Response(
                {"detail": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return None

    def get(self, request):
        error = self._check_admin(request)

        if error:
            return error

        catalog = list(
            MedicineCatalog.objects.all().values(
                "id",
                "name",
                "brand",
                "dosage",
                "description",
                "created_at",
            )
        )

        catalog_names = {
            item["name"].strip().lower()
            for item in catalog
            if item.get("name")
        }

        existing_medications = (
            Medication.objects
            .order_by("name")
            .values(
                "id",
                "name",
                "dosage",
                "condition",
            )
        )

        next_catalog_id = (
            MedicineCatalog.objects.order_by("-id")
            .values_list("id", flat=True)
            .first()
            or 0
        )

        for medication in existing_medications:
            normalized_name = (
                medication["name"] or ""
            ).strip().lower()

            if (
                normalized_name
                and normalized_name not in catalog_names
            ):
                next_catalog_id += 1

                catalog.append(
                    {
                        "id": f"medication-{medication['id']}",
                        "name": medication["name"],
                        "brand": None,
                        "dosage": medication["dosage"],
                        "description": (
                            medication["condition"]
                            or None
                        ),
                        "created_at": None,
                    }
                )

                catalog_names.add(normalized_name)

        catalog.sort(
            key=lambda item: (
                str(item.get("name") or "").lower()
            )
        )

        return Response(catalog)

    def post(self, request):
        error = self._check_admin(request)

        if error:
            return error

        name = str(
            request.data.get("name", "")
        ).strip()

        brand = str(
            request.data.get("brand", "")
        ).strip()

        dosage = str(
            request.data.get("dosage", "")
        ).strip()

        description = str(
            request.data.get("description", "")
        ).strip()

        if not name:
            return Response(
                {"detail": "Medicine name is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = MedicineCatalog.objects.filter(
            name__iexact=name
        ).first()

        if existing:
            return Response(
                {
                    "detail": (
                        "This medicine already exists "
                        "in the catalog."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        medicine = MedicineCatalog.objects.create(
            name=name,
            brand=brand or None,
            dosage=dosage or None,
            description=description or None,
        )

        return Response(
            {
                "id": medicine.id,
                "name": medicine.name,
                "brand": medicine.brand,
                "dosage": medicine.dosage,
                "description": medicine.description,
                "created_at": medicine.created_at,
            },
            status=status.HTTP_201_CREATED,
        )