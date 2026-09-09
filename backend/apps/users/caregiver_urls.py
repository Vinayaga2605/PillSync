from django.urls import path
from .caregiver_views import (
    CaregiverPatientsView,
    CaregiverPatientDetailView,
    CaregiverMissedDoseAlertsView,
)

urlpatterns = [
    path("patients/", CaregiverPatientsView.as_view(), name="caregiver-patients"),
    path("patients/<int:patient_id>/", CaregiverPatientDetailView.as_view(), name="caregiver-patient-detail"),
    path("missed-dose-alerts/", CaregiverMissedDoseAlertsView.as_view(), name="caregiver-missed-alerts"),
]