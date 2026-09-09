from django.db import models
from django.conf import settings


class Medication(models.Model):
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="medications"
    )
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    doses_per_day = models.PositiveIntegerField(default=1)
    total_stock = models.PositiveIntegerField(default=0)
    remaining_stock = models.PositiveIntegerField(default=0)
    condition = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.patient.username})"


class Refill(models.Model):
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        related_name="refills"
    )
    quantity = models.PositiveIntegerField(default=0)
    refill_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-refill_date", "-id"]

    def __str__(self):
        return f"{self.medication.name} - {self.quantity} units - {self.refill_date}"