from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        CAREGIVER = "caregiver", "Caregiver"
        ADMIN = "admin", "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class CaregiverAssignment(models.Model):
    caregiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assigned_patients")
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="caregivers")
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("caregiver", "patient")

    def __str__(self):
        return f"{self.caregiver.username} → {self.patient.username}"