from django.urls import path

from .caregiver_views import (
    AvailableCaregiversView,
    CaregiverDashboardView,
    CaregiverPatientsView,
    CaregiverPatientDetailView,
    CaregiverMedicationMonitoringView,
    CaregiverPatientAnalyticsView,
    CaregiverMissedDoseAlertsView,
    CaregiverAlertsView,
)

urlpatterns = [
    # Available caregivers
    path(
        "available/",
        AvailableCaregiversView.as_view(),
        name="available-caregivers",
    ),

    # Caregiver dashboard
    path(
        "dashboard/",
        CaregiverDashboardView.as_view(),
        name="caregiver-dashboard",
    ),

    # Assigned patients
    path(
        "patients/",
        CaregiverPatientsView.as_view(),
        name="caregiver-patients",
    ),

    # Individual patient details
    path(
        "patients/<int:patient_id>/",
        CaregiverPatientDetailView.as_view(),
        name="caregiver-patient-detail",
    ),

    # Medication monitoring
    path(
        "medications/",
        CaregiverMedicationMonitoringView.as_view(),
        name="caregiver-medication-monitoring",
    ),

    # Patient analytics
    path(
        "analytics/",
        CaregiverPatientAnalyticsView.as_view(),
        name="caregiver-patient-analytics",
    ),

    # Missed dose alerts
    path(
        "missed-dose-alerts/",
        CaregiverMissedDoseAlertsView.as_view(),
        name="caregiver-missed-alerts",
    ),

    # All caregiver alerts
    path(
        "alerts/",
        CaregiverAlertsView.as_view(),
        name="caregiver-alerts",
    ),
]