from django.db import models
from apps.medications.models import Medication


class Reminder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TAKEN = "taken", "Taken"
        MISSED = "missed", "Missed"
        SNOOZED = "snoozed", "Snoozed"

    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="reminders")
    time = models.TimeField()
    label = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["time"]

    def __str__(self):
        return f"{self.medication.name} @ {self.time} ({self.status})"