from django.db import models
from apps.medications.models import Medication


class DoseLog(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TAKEN = "taken", "Taken"
        MISSED = "missed", "Missed"

    medication = models.ForeignKey(Medication, on_delete=models.CASCADE, related_name="dose_logs")
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    taken_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-scheduled_date", "-scheduled_time"]

    def __str__(self):
        return f"{self.medication.name} - {self.scheduled_date} ({self.status})"