from rest_framework import serializers
from .models import Reminder


class ReminderSerializer(serializers.ModelSerializer):
    medicineName = serializers.CharField(
        source="medication.name",
        read_only=True
    )
    dosage = serializers.CharField(
        source="medication.dosage",
        read_only=True
    )
    instructions = serializers.CharField(
        source="label",
        read_only=True
    )

    class Meta:
        model = Reminder
        fields = [
            "id",
            "medication",
            "medicineName",
            "dosage",
            "time",
            "label",
            "instructions",
            "status",
            "date",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
