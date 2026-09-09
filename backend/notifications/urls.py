from django.urls import path

from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationDeleteView,
    NotificationClearAllView,
    NotificationPreferenceView,
)

urlpatterns = [
    path(
        "",
        NotificationListView.as_view(),
        name="notification-list"
    ),

    path(
        "<int:notification_id>/read/",
        NotificationMarkReadView.as_view(),
        name="notification-read"
    ),

    path(
        "<int:notification_id>/delete/",
        NotificationDeleteView.as_view(),
        name="notification-delete"
    ),

    path(
        "clear-all/",
        NotificationClearAllView.as_view(),
        name="notification-clear-all"
    ),

    path(
        "preferences/",
        NotificationPreferenceView.as_view(),
        name="notification-preferences"
    ),
]