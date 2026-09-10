from django.urls import path

from .admin_views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminUserCreateView,
    AdminUserUpdateView,
    AdminUserDeleteView,
    AdminUserToggleActiveView,
    AdminCaregiverListView,
    AdminAssignCaregiverView,
    AdminSystemStatsView,
)

urlpatterns = [
    path("users/", AdminUserListView.as_view()),
    path("users/create/", AdminUserCreateView.as_view()),
    path("users/<int:user_id>/", AdminUserDetailView.as_view()),
    path("users/<int:user_id>/update/", AdminUserUpdateView.as_view()),
    path("users/<int:user_id>/delete/", AdminUserDeleteView.as_view()),
    path("users/<int:user_id>/toggle-active/", AdminUserToggleActiveView.as_view()),
    path("caregivers/", AdminCaregiverListView.as_view()),
    path("patients/<int:patient_id>/assign-caregiver/", AdminAssignCaregiverView.as_view()),
    path("stats/", AdminSystemStatsView.as_view()),
]
