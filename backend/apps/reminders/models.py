from django.conf import settings
from django.db import models

from apps.medications.models import Medication


class Reminder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TAKEN = "taken", "Taken"
        MISSED = "missed", "Missed"
        SNOOZED = "snoozed", "Snoozed"

    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    time = models.TimeField()
    label = models.CharField(
        max_length=50,
        blank=True,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    date = models.DateField(
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["time"]

    def __str__(self):
        return (
            f"{self.medication.name} @ "
            f"{self.time} ({self.status})"
        )


class MedicationSchedule(models.Model):
    class FrequencyType(models.TextChoices):
        DAILY = "DAILY", "Daily"
        WEEKLY = "WEEKLY", "Weekly"
        SPECIFIC_DAYS = "SPECIFIC_DAYS", "Specific Days"
        INTERVAL_DAYS = "INTERVAL_DAYS", "Interval Days"
        AS_NEEDED = "AS_NEEDED", "As Needed"
        CUSTOM = "CUSTOM", "Custom"

    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="schedules",
    )

    frequency_type = models.CharField(
        max_length=30,
        choices=FrequencyType.choices,
    )

    dose_quantity = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=1.0,
    )

    dosage_unit = models.CharField(
        max_length=30,
        blank=True,
        null=True,
    )

    days_of_week = models.JSONField(
        default=list,
        blank=True,
    )

    interval_days = models.PositiveIntegerField(
        blank=True,
        null=True,
    )

    start_date = models.DateField()

    end_date = models.DateField(
        blank=True,
        null=True,
    )

    instructions = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at"
        ]
        indexes = [
            models.Index(
                fields=[
                    "medication",
                    "is_active",
                ],
                name="schedule_med_active_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.medication.name} - "
            f"{self.frequency_type}"
        )


class MedicationScheduleTime(models.Model):
    class TimeOfDay(models.TextChoices):
        MORNING = "MORNING", "Morning"
        AFTERNOON = "AFTERNOON", "Afternoon"
        EVENING = "EVENING", "Evening"
        NIGHT = "NIGHT", "Night"
        CUSTOM = "CUSTOM", "Custom"

    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.CASCADE,
        related_name="schedule_times",
    )

    scheduled_time = models.TimeField()

    time_of_day_type = models.CharField(
        max_length=20,
        choices=TimeOfDay.choices,
        blank=True,
        null=True,
    )

    dose_quantity = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "scheduled_time"
        ]
        indexes = [
            models.Index(
                fields=[
                    "schedule",
                    "scheduled_time",
                ],
                name="schedule_time_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.schedule.medication.name} "
            f"@ {self.scheduled_time}"
        )


class MedicationDoseEvent(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        TAKEN = "TAKEN", "Taken"
        MISSED = "MISSED", "Missed"
        SNOOZED = "SNOOZED", "Snoozed"
        SKIPPED = "SKIPPED", "Skipped"

    patient_medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="dose_events",
    )

    schedule = models.ForeignKey(
        MedicationSchedule,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dose_events",
    )

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dose_events",
    )

    scheduled_timestamp = models.DateTimeField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    actual_taken_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    snoozed_until_timestamp = models.DateTimeField(
        null=True,
        blank=True,
    )

    dose_quantity_taken = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
    )

    recorded_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_dose_events",
    )

    notes = models.TextField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "scheduled_timestamp"
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "schedule",
                    "scheduled_timestamp",
                ],
                name="unique_schedule_dose_timestamp",
            )
        ]
        indexes = [
            models.Index(
                fields=[
                    "patient",
                    "scheduled_timestamp",
                ],
                name="dose_patient_time_idx",
            ),
            models.Index(
                fields=[
                    "patient_medication",
                    "status",
                    "scheduled_timestamp",
                ],
                name="dose_med_status_time_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.patient.username} - "
            f"{self.scheduled_timestamp} - "
            f"{self.status}"
        )