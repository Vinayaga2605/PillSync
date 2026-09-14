from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ReminderViewSet,
    MedicationScheduleViewSet,
)

router = DefaultRouter()
router.register(
    "",
    ReminderViewSet,
    basename="reminder",
)

urlpatterns = [
    path(
        "medications/<int:medicine_id>/schedules/",
        MedicationScheduleViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="medication-schedules",
    ),
    path(
        "medications/<int:medicine_id>/schedules/<int:pk>/",
        MedicationScheduleViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="medication-schedule-detail",
    ),
    path(
        "",
        include(router.urls),
    ),
]