from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    MedicationViewSet,
    AdminMedicineCatalogView,
)


urlpatterns = [
    path(
        "admin-catalog/",
        AdminMedicineCatalogView.as_view(),
        name="admin-medicine-catalog",
    ),
]

router = DefaultRouter()

router.register(
    "",
    MedicationViewSet,
    basename="medication",
)

urlpatterns += router.urls