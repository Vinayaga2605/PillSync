from django.urls import path
from .admin_views import AdminUserListView, AdminUserToggleActiveView, AdminSystemStatsView

urlpatterns = [
    path("users/", AdminUserListView.as_view()),
    path("users/<int:user_id>/toggle-active/", AdminUserToggleActiveView.as_view()),
    path("stats/", AdminSystemStatsView.as_view()),
]