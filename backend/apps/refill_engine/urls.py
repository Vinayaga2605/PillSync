from django.urls import path
from .views import RefillForecastView

urlpatterns = [
    path("forecast/", RefillForecastView.as_view(), name="refill-forecast"),
]
