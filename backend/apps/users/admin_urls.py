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
    AdminSystemLogsView,
    AdminLoginHistoryView,
    AdminNotificationLogsView,
)

from .report_views import (
    AdminReportTypesView,
    AdminReportDetailView,
    AdminReportExportView,
)


urlpatterns = [
    path(
        "users/",
        AdminUserListView.as_view(),
    ),
    path(
        "users/create/",
        AdminUserCreateView.as_view(),
    ),
    path(
        "users/<int:user_id>/",
        AdminUserDetailView.as_view(),
    ),
    path(
        "users/<int:user_id>/update/",
        AdminUserUpdateView.as_view(),
    ),
    path(
        "users/<int:user_id>/delete/",
        AdminUserDeleteView.as_view(),
    ),
    path(
        "users/<int:user_id>/toggle-active/",
        AdminUserToggleActiveView.as_view(),
    ),
    path(
        "caregivers/",
        AdminCaregiverListView.as_view(),
    ),
    path(
        "patients/<int:patient_id>/assign-caregiver/",
        AdminAssignCaregiverView.as_view(),
    ),
    path(
        "stats/",
        AdminSystemStatsView.as_view(),
    ),
    path(
        "system-logs/",
        AdminSystemLogsView.as_view(),
    ),
    path(
        "login-history/",
        AdminLoginHistoryView.as_view(),
    ),
    path(
        "notification-logs/",
        AdminNotificationLogsView.as_view(),
    ),

    path(
        "reports/",
        AdminReportTypesView.as_view(),
    ),
    path(
        "reports/<str:report_type>/",
        AdminReportDetailView.as_view(),
    ),
    path(
        "reports/<str:report_type>/export/",
        AdminReportExportView.as_view(),
    ),
]