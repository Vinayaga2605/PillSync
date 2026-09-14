from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        REMINDER = "reminder", "Reminder"
        REFILL = "refill", "Refill"
        MISSED = "missed", "Missed Dose"
        SYSTEM = "system", "System"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.SYSTEM,
    )

    title = models.CharField(max_length=150)

    message = models.CharField(max_length=300)

    is_read = models.BooleanField(default=False)

    is_archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class NotificationLog(models.Model):
    notification = models.ForeignKey(
        Notification,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="delivery_logs",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_logs",
    )

    channel = models.CharField(
        max_length=50,
        default="System",
    )

    status = models.CharField(
        max_length=30,
        default="sent",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.channel} - "
            f"{self.status}"
        )