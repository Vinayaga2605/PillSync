from django.urls import path

from .views import (
    RefillForecastView,
    AdminRefillForecastView,
)


urlpatterns = [
    path(
        "forecast/",
        RefillForecastView.as_view(),
        name="refill-forecast",
    ),
    path(
        "admin-forecast/",
        AdminRefillForecastView.as_view(),
        name="admin-refill-forecast",
    ),
]