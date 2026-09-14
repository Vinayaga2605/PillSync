from datetime import date as date_cls, datetime, time, timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Reminder,
    MedicationSchedule,
    MedicationScheduleTime,
)
from .serializers import (
    ReminderSerializer,
    MedicationScheduleSerializer,
    MedicationScheduleWriteSerializer,
)

from apps.adherence.models import DoseLog
from apps.notifications.models import Notification, NotificationLog
from apps.users.models import CaregiverAssignment


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

    def create_notification(
        self,
        user,
        notification_type,
        title,
        message,
    ):
        notification = Notification.objects.create(
            user=user,
            type=notification_type,
            title=title,
            message=message,
            is_read=False,
        )

        NotificationLog.objects.create(
            notification=notification,
            user=user,
            channel="System",
            status="sent",
        )

        return notification

    def notify_caregivers(
        self,
        patient,
        notification_type,
        title,
        message,
    ):
        assignments = CaregiverAssignment.objects.filter(
            patient=patient
        ).select_related("caregiver")

        for assignment in assignments:
            caregiver = assignment.caregiver

            self.create_notification(
                user=caregiver,
                notification_type=notification_type,
                title=title,
                message=message,
            )

    def schedule_occurs_today(
        self,
        schedule,
        today,
    ):
        if not schedule.is_active:
            return False

        if schedule.start_date and today < schedule.start_date:
            return False

        if schedule.end_date and today > schedule.end_date:
            return False

        frequency = schedule.frequency_type

        if frequency == MedicationSchedule.FrequencyType.AS_NEEDED:
            return False

        if frequency == MedicationSchedule.FrequencyType.DAILY:
            return True

        if frequency in [
            MedicationSchedule.FrequencyType.WEEKLY,
            MedicationSchedule.FrequencyType.SPECIFIC_DAYS,
        ]:
            weekday = today.isoweekday()
            days = schedule.days_of_week or []

            return weekday in days

        if frequency == MedicationSchedule.FrequencyType.INTERVAL_DAYS:
            if not schedule.start_date:
                return False

            difference = (
                today - schedule.start_date
            ).days

            interval = schedule.interval_days or 1

            return difference >= 0 and difference % interval == 0

        if frequency == MedicationSchedule.FrequencyType.CUSTOM:
            return True

        return False

    @transaction.atomic
    def generate_today_reminders(self, request):
        today = timezone.localdate()

        schedules = (
            MedicationSchedule.objects.filter(
                medication__patient=request.user,
                is_active=True,
            )
            .select_related("medication")
            .prefetch_related("schedule_times")
        )

        generated = 0

        for schedule in schedules:
            if not self.schedule_occurs_today(
                schedule,
                today,
            ):
                continue

            times = list(
                schedule.schedule_times.all()
            )

            for schedule_time in times:
                exists = Reminder.objects.filter(
                    medication=schedule.medication,
                    date=today,
                    time=schedule_time.scheduled_time,
                ).exists()

                if exists:
                    continue

                label_parts = []

                if schedule_time.time_of_day_type:
                    label_parts.append(
                        schedule_time.get_time_of_day_type_display()
                    )

                if schedule.instructions:
                    label_parts.append(
                        schedule.instructions
                    )

                label = " • ".join(label_parts)

                Reminder.objects.create(
                    medication=schedule.medication,
                    time=schedule_time.scheduled_time,
                    label=label[:50],
                    status=Reminder.Status.PENDING,
                    date=today,
                )

                generated += 1

        reminders = self.get_queryset().filter(
            date=today
        )

        return Response(
            {
                "generated": generated,
                "reminders": ReminderSerializer(
                    reminders,
                    many=True,
                ).data,
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="today-schedule",
    )
    def today_schedule(self, request):
        return self.generate_today_reminders(request)

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
        medication = reminder.medication
        patient = medication.patient

        if (
            new_status == Reminder.Status.TAKEN
            and old_status == Reminder.Status.TAKEN
        ):
            return Response(
                {
                    "message": "Reminder already marked as taken.",
                    "reminder": ReminderSerializer(
                        reminder
                    ).data,
                    "remainingStock": medication.remaining_stock,
                },
                status=status.HTTP_200_OK,
            )

        reminder.status = new_status
        reminder.save(update_fields=["status"])

        if new_status in [
            Reminder.Status.TAKEN,
            Reminder.Status.MISSED,
        ]:
            log_date = reminder.date or date_cls.today()

            dose_log, created = DoseLog.objects.update_or_create(
                medication=medication,
                scheduled_date=log_date,
                scheduled_time=reminder.time,
                defaults={
                    "status": new_status,
                },
            )

            if new_status == Reminder.Status.TAKEN:
                dose_log.taken_at = timezone.now()
                dose_log.save(
                    update_fields=["taken_at"]
                )

        if (
            new_status == Reminder.Status.TAKEN
            and old_status != Reminder.Status.TAKEN
        ):
            if medication.remaining_stock > 0:
                medication.remaining_stock -= 1

                medication.save(
                    update_fields=[
                        "remaining_stock"
                    ]
                )

        if (
            new_status == Reminder.Status.MISSED
            and old_status != Reminder.Status.MISSED
        ):
            title = "Missed Medicine Dose"

            message = (
                f"You missed your scheduled dose of "
                f"{medication.name} at "
                f"{reminder.time.strftime('%I:%M %p')}."
            )

            self.create_notification(
                user=patient,
                notification_type=Notification.Type.MISSED,
                title=title,
                message=message,
            )

            self.notify_caregivers(
                patient=patient,
                notification_type=Notification.Type.MISSED,
                title="Patient Missed Medicine Dose",
                message=(
                    f"{patient.get_full_name() or patient.username} "
                    f"missed the scheduled dose of "
                    f"{medication.name} at "
                    f"{reminder.time.strftime('%I:%M %p')}."
                ),
            )

        if (
            new_status == Reminder.Status.TAKEN
            and old_status != Reminder.Status.TAKEN
        ):
            remaining_stock = medication.remaining_stock

            if remaining_stock in [5, 2, 0]:
                if remaining_stock == 0:
                    message = (
                        f"{medication.name} is out of stock. "
                        "Please arrange a refill immediately."
                    )
                    title = "Medicine Out of Stock"

                elif remaining_stock == 2:
                    message = (
                        f"{medication.name} has only 2 doses remaining. "
                        "Please arrange a refill soon."
                    )
                    title = "Critical Medicine Stock"

                else:
                    message = (
                        f"{medication.name} has only 5 doses remaining. "
                        "Please arrange a refill."
                    )
                    title = "Low Medicine Stock"

                self.create_notification(
                    user=patient,
                    notification_type=Notification.Type.REFILL,
                    title=title,
                    message=message,
                )

                self.notify_caregivers(
                    patient=patient,
                    notification_type=Notification.Type.REFILL,
                    title=title,
                    message=(
                        f"{patient.get_full_name() or patient.username}'s "
                        f"{medication.name} stock is low. "
                        f"Remaining stock: {remaining_stock}."
                    ),
                )

        return Response(
            {
                "message": f"Reminder marked as {new_status}.",
                "reminder": ReminderSerializer(
                    reminder
                ).data,
                "remainingStock": medication.remaining_stock,
            },
            status=status.HTTP_200_OK,
        )


class MedicationScheduleViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_medication(self, request, medicine_id):
        from apps.medications.models import Medication

        return get_object_or_404(
            Medication,
            id=medicine_id,
            patient=request.user,
        )

    def list(self, request, medicine_id=None):
        medication = self.get_medication(
            request,
            medicine_id,
        )

        schedules = (
            MedicationSchedule.objects
            .filter(
                medication=medication
            )
            .prefetch_related(
                "schedule_times"
            )
            .order_by("-created_at")
        )

        return Response(
            MedicationScheduleSerializer(
                schedules,
                many=True,
            ).data
        )

    def retrieve(
        self,
        request,
        medicine_id=None,
        pk=None,
    ):
        medication = self.get_medication(
            request,
            medicine_id,
        )

        schedule = get_object_or_404(
            MedicationSchedule.objects.prefetch_related(
                "schedule_times"
            ),
            id=pk,
            medication=medication,
        )

        return Response(
            MedicationScheduleSerializer(
                schedule
            ).data
        )

    @transaction.atomic
    def create(self, request, medicine_id=None):
        medication = self.get_medication(
            request,
            medicine_id,
        )

        serializer = MedicationScheduleWriteSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        validated = serializer.validated_data
        times_data = validated.pop(
            "times",
            []
        )

        schedule = MedicationSchedule.objects.create(
            medication=medication,
            **validated,
        )

        self._create_times(
            schedule,
            times_data,
        )

        schedule.refresh_from_db()

        return Response(
            MedicationScheduleSerializer(
                schedule
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @transaction.atomic
    def partial_update(
        self,
        request,
        medicine_id=None,
        pk=None,
    ):
        medication = self.get_medication(
            request,
            medicine_id,
        )

        schedule = get_object_or_404(
            MedicationSchedule,
            id=pk,
            medication=medication,
        )

        serializer = MedicationScheduleWriteSerializer(
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        validated = serializer.validated_data

        times_provided = "times" in validated

        times_data = validated.pop(
            "times",
            []
        )

        for field, value in validated.items():
            setattr(
                schedule,
                field,
                value,
            )

        schedule.save()

        if times_provided:
            schedule.schedule_times.all().delete()

            self._create_times(
                schedule,
                times_data,
            )

        schedule.refresh_from_db()

        return Response(
            MedicationScheduleSerializer(
                schedule
            ).data
        )

    @transaction.atomic
    def destroy(
        self,
        request,
        medicine_id=None,
        pk=None,
    ):
        medication = self.get_medication(
            request,
            medicine_id,
        )

        schedule = get_object_or_404(
            MedicationSchedule,
            id=pk,
            medication=medication,
        )

        schedule.delete()

        return Response(
            {
                "message": (
                    "Schedule deleted successfully."
                )
            },
            status=status.HTTP_200_OK,
        )

    def _create_times(
        self,
        schedule,
        times_data,
    ):
        for item in times_data:
            MedicationScheduleTime.objects.create(
                schedule=schedule,
                **item,
            )