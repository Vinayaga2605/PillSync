from rest_framework import serializers
from .models import Medication


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "id", "name", "dosage", "frequency", "doses_per_day",
            "total_stock", "remaining_stock", "condition", "created_at",
        ]
        read_only_fields = ["id", "created_at"]