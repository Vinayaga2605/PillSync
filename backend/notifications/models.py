from django.db import models
from django.contrib.auth.models import User
from medications.models import Medication


class Notification(models.Model):

    NOTIFICATION_TYPES = [
        ("medicine", "Medicine Reminder"),
        ("refill", "Refill Alert"),
        ("missed", "Missed Dose"),
        ("appointment", "Doctor Appointment"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    # Connect notification with the medicine/tablet
    medication = models.ForeignKey(
        Medication,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications"
    )

    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES
    )

    title = models.CharField(
        max_length=200
    )

    message = models.TextField()

    is_read = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class NotificationPreference(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="notification_preference"
    )

    push_enabled = models.BooleanField(
        default=False
    )

    def __str__(self):
        return f"{self.user.username} notification preferences"