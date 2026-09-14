from decimal import Decimal

from rest_framework import serializers

from .models import (
    Reminder,
    MedicationSchedule,
    MedicationScheduleTime,
)


class ReminderSerializer(serializers.ModelSerializer):
    medicineName = serializers.CharField(
        source="medication.name",
        read_only=True,
    )
    dosage = serializers.CharField(
        source="medication.dosage",
        read_only=True,
    )
    instructions = serializers.CharField(
        source="label",
        read_only=True,
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
        read_only_fields = [
            "id",
            "created_at",
        ]


class MedicationScheduleTimeSerializer(
    serializers.ModelSerializer
):
    class Meta:
        model = MedicationScheduleTime
        fields = [
            "id",
            "scheduled_time",
            "time_of_day_type",
            "dose_quantity",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
        ]


class MedicationScheduleSerializer(
    serializers.ModelSerializer
):
    times = MedicationScheduleTimeSerializer(
        source="schedule_times",
        many=True,
        read_only=True,
    )

    medicine_name = serializers.CharField(
        source="medication.name",
        read_only=True,
    )

    class Meta:
        model = MedicationSchedule
        fields = [
            "id",
            "medication",
            "medicine_name",
            "frequency_type",
            "dose_quantity",
            "dosage_unit",
            "days_of_week",
            "interval_days",
            "start_date",
            "end_date",
            "instructions",
            "is_active",
            "times",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "medication",
            "medicine_name",
            "times",
            "created_at",
            "updated_at",
        ]


class MedicationScheduleWriteSerializer(
    serializers.Serializer
):
    frequency_type = serializers.ChoiceField(
        choices=MedicationSchedule.FrequencyType.choices
    )

    dose_quantity = serializers.DecimalField(
        max_digits=6,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )

    dosage_unit = serializers.CharField(
        max_length=30,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    days_of_week = serializers.ListField(
        child=serializers.IntegerField(
            min_value=1,
            max_value=7,
        ),
        required=False,
        allow_null=True,
    )

    interval_days = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )

    start_date = serializers.DateField()

    end_date = serializers.DateField(
        required=False,
        allow_null=True,
    )

    instructions = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    is_active = serializers.BooleanField(
        required=False,
        default=True,
    )

    times = MedicationScheduleTimeSerializer(
        many=True,
        required=False,
    )

    def validate(self, attrs):
        frequency = attrs.get("frequency_type")
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {
                    "end_date": (
                        "End date cannot be before start date."
                    )
                }
            )

        days = attrs.get("days_of_week")

        if days is None:
            attrs["days_of_week"] = []
            days = []

        if frequency in {
            "WEEKLY",
            "SPECIFIC_DAYS",
        }:
            if not days:
                raise serializers.ValidationError(
                    {
                        "days_of_week": (
                            "Select at least one day."
                        )
                    }
                )

        if frequency == "INTERVAL_DAYS":
            interval = attrs.get("interval_days")

            if not interval or interval < 1:
                raise serializers.ValidationError(
                    {
                        "interval_days": (
                            "Interval must be at least 1 day."
                        )
                    }
                )

        if "times" not in attrs:
            attrs["times"] = []

        times = attrs.get("times", [])

        if frequency != "AS_NEEDED" and not times:
            raise serializers.ValidationError(
                {
                    "times": (
                        "Add at least one scheduled time."
                    )
                }
            )

        if frequency == "AS_NEEDED":
            attrs["times"] = []

        if frequency != "INTERVAL_DAYS":
            attrs["interval_days"] = None

        if frequency not in {
            "WEEKLY",
            "SPECIFIC_DAYS",
        }:
            attrs["days_of_week"] = []

        return attrs


class MedicationScheduleCreateSerializer(
    MedicationScheduleWriteSerializer
):
    pass