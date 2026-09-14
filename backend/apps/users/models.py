from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        CAREGIVER = "caregiver", "Caregiver"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PATIENT,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True,
    )

    email_verified = models.BooleanField(
        default=False,
    )

    phone_verified = models.BooleanField(
        default=False,
    )

    email_verification_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
    )

    phone_verification_code = models.CharField(
        max_length=6,
        blank=True,
        null=True,
    )

    email_verification_expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    phone_verification_expires_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class UserSettings(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="settings",
    )

    theme = models.CharField(
        max_length=10,
        choices=[
            ("light", "Light"),
            ("dark", "Dark"),
            ("system", "System"),
        ],
        default="light",
    )

    medication_reminders = models.BooleanField(
        default=True,
    )

    missed_dose_alerts = models.BooleanField(
        default=True,
    )

    refill_alerts = models.BooleanField(
        default=True,
    )

    system_notifications = models.BooleanField(
        default=True,
    )

    reminder_sound = models.BooleanField(
        default=True,
    )

    reminder_lead_time = models.PositiveIntegerField(
        default=15,
    )

    language = models.CharField(
        max_length=30,
        default="English",
    )

    time_format = models.CharField(
        max_length=5,
        choices=[
            ("12", "12-hour"),
            ("24", "24-hour"),
        ],
        default="12",
    )

    date_format = models.CharField(
        max_length=20,
        choices=[
            ("DD/MM/YYYY", "DD/MM/YYYY"),
            ("MM/DD/YYYY", "MM/DD/YYYY"),
            ("YYYY-MM-DD", "YYYY-MM-DD"),
        ],
        default="DD/MM/YYYY",
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return f"Settings - {self.user.username}"


class CaregiverAssignment(models.Model):
    caregiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="assigned_patients",
    )

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="caregivers",
    )

    assigned_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        unique_together = ("caregiver", "patient")

    def __str__(self):
        return (
            f"{self.caregiver.username} -> "
            f"{self.patient.username}"
        )


class LoginHistory(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="login_history",
    )

    success = models.BooleanField(
        default=True,
    )

    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.user.username} - {status}"


class SystemLog(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_logs",
    )

    action = models.CharField(
        max_length=100,
    )

    details = models.CharField(
        max_length=300,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} - {self.created_at}"