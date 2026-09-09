from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):

    medication_name = serializers.CharField(
        source="medication.name",
        read_only=True
    )

    medication_dosage = serializers.CharField(
        source="medication.dosage",
        read_only=True
    )

    medication_time = serializers.TimeField(
        source="medication.time",
        read_only=True
    )

    class Meta:
        model = Notification

        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "is_read",
            "created_at",
            "medication_name",
            "medication_dosage",
            "medication_time",
        ]