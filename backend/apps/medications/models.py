from django.db import models
from django.contrib.auth.models import User


class Medication(models.Model):

    FREQUENCY_CHOICES = [
        ("once_daily", "Once Daily"),
        ("twice_daily", "Twice Daily"),
        ("three_times_daily", "Three Times Daily"),
        ("as_needed", "As Needed"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="medications"
    )

    name = models.CharField(max_length=200)

    dosage = models.CharField(max_length=100)

    frequency = models.CharField(
        max_length=30,
        choices=FREQUENCY_CHOICES,
        default="once_daily"
    )

    time = models.TimeField()

    start_date = models.DateField()

    end_date = models.DateField(
        null=True,
        blank=True
    )

    quantity = models.PositiveIntegerField(
        default=0
    )

    refill_threshold = models.PositiveIntegerField(
        default=5
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.name} - {self.dosage}"