from datetime import date as date_cls

from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Reminder
from .serializers import ReminderSerializer
from apps.adherence.models import DoseLog


class ReminderViewSet(viewsets.ModelViewSet):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Reminder.objects.filter(
            medication__patient=self.request.user
        ).order_by("time")

        if self.request.query_params.get("today") == "true":
            qs = qs.filter(date=date_cls.today())

        return qs

    @action(detail=True, methods=["patch"])
    def mark(self, request, pk=None):
        reminder = self.get_object()

        new_status = request.data.get("status")

        if new_status not in dict(Reminder.Status.choices):
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = reminder.status

        # Prevent taking the same reminder twice
        if (
            new_status == Reminder.Status.TAKEN
            and old_status == Reminder.Status.TAKEN
        ):
            return Response(
                {
                    "message": "Reminder already marked as taken.",
                    "reminder": ReminderSerializer(reminder).data,
                    "remainingStock": reminder.medication.remaining_stock,
                },
                status=status.HTTP_200_OK,
            )

        reminder.status = new_status
        reminder.save(update_fields=["status"])

        # Create/update corresponding DoseLog
        if new_status in [
            Reminder.Status.TAKEN,
            Reminder.Status.MISSED,
        ]:
            log_date = reminder.date or date_cls.today()

            dose_log, created = DoseLog.objects.update_or_create(
                medication=reminder.medication,
                scheduled_date=log_date,
                scheduled_time=reminder.time,
                defaults={
                    "status": new_status,
                },
            )

            # Record actual time when dose was taken
            if new_status == Reminder.Status.TAKEN:
                dose_log.taken_at = timezone.now()
                dose_log.save(update_fields=["taken_at"])

        # Reduce medicine stock ONLY when changing into TAKEN
        # and never when already taken.
        if (
            new_status == Reminder.Status.TAKEN
            and old_status != Reminder.Status.TAKEN
        ):
            medication = reminder.medication

            if medication.remaining_stock > 0:
                medication.remaining_stock -= 1
                medication.save(update_fields=["remaining_stock"])

        return Response(
            {
                "message": f"Reminder marked as {new_status}.",
                "reminder": ReminderSerializer(reminder).data,
                "remainingStock": reminder.medication.remaining_stock,
            },
            status=status.HTTP_200_OK,
        )