from django.urls import path
from .views import MedicationListCreateView, MedicationDetailView


urlpatterns = [
    path(
        "",
        MedicationListCreateView.as_view(),
        name="medication-list-create"
    ),

    path(
        "<int:medication_id>/",
        MedicationDetailView.as_view(),
        name="medication-detail"
    ),
]