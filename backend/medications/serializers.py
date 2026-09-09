from rest_framework import serializers
from .models import Medication


class MedicationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Medication

        fields = [
            "id",
            "name",
            "dosage",
            "frequency",
            "time",
            "start_date",
            "end_date",
            "quantity",
            "refill_threshold",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]
