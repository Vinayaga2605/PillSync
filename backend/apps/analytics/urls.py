from django.urls import path

from .views import (
    AdherenceTrendView,
    MissedByMedicineView,
    AdherenceByMedicineView,
    RefillStatsView,
    WeeklyReportView,
    MonthlyReportView,
    ConsistencyView,
    AdminAnalyticsView,
)

from .ai_views import AIAssistantView


urlpatterns = [
    path(
        "adherence-trend/",
        AdherenceTrendView.as_view(),
    ),
    path(
        "missed-by-medicine/",
        MissedByMedicineView.as_view(),
    ),
    path(
        "adherence-by-medicine/",
        AdherenceByMedicineView.as_view(),
    ),
    path(
        "refill-stats/",
        RefillStatsView.as_view(),
    ),
    path(
        "weekly-report/",
        WeeklyReportView.as_view(),
    ),
    path(
        "monthly-report/",
        MonthlyReportView.as_view(),
    ),
    path(
        "consistency/",
        ConsistencyView.as_view(),
    ),
    path(
        "admin-report/",
        AdminAnalyticsView.as_view(),
    ),
    path(
        "ai-assistant/",
        AIAssistantView.as_view(),
        name="ai-assistant",
    ),
]