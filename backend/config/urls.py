from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/analytics/", include("apps.analytics.urls")),
    path("api/caregiver/", include("apps.users.caregiver_urls")),
    path("api/medications/", include("apps.medications.urls")),
    path("api/reminders/", include("apps.reminders.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/adherence/", include("apps.adherence.urls")),
    path("api/refill/", include("apps.refill_engine.urls")),
    path("api/admin/", include("apps.users.admin_urls")),
    path("api/ocr/", include("apps.ocr.urls")),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc-ui"),
]
