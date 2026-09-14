from django.urls import path

from .views import OCRScanView, OCRSaveMedicinesView


urlpatterns = [
    path("", OCRScanView.as_view(), name="ocr-scan"),
    path("save/", OCRSaveMedicinesView.as_view(), name="ocr-save-medicines"),
]