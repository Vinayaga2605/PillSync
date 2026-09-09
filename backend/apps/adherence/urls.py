from django.urls import path

from .views import (
    DoseLogListView,
    TakeDoseView,
    MissDoseView,
)

urlpatterns = [
    path("", DoseLogListView.as_view(), name="dose-list"),
    path("<int:dose_id>/take/", TakeDoseView.as_view(), name="take-dose"),
    path("<int:dose_id>/miss/", MissDoseView.as_view(), name="miss-dose"),
]