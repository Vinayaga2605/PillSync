from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator

from rest_framework import serializers

from .models import User, UserSettings


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=6,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "phone_number",
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
            role=validated_data.get(
                "role",
                User.Role.PATIENT,
            ),
            phone_number=validated_data.get(
                "phone_number",
                "",
            ),
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, data):
        user = authenticate(
            username=data["username"],
            password=data["password"],
        )

        if not user:
            raise serializers.ValidationError(
                "Invalid username or password."
            )

        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "phone_number",
            "date_of_birth",
            "email_verified",
            "phone_verified",
        ]
        read_only_fields = [
            "id",
            "role",
            "email_verified",
            "phone_verified",
        ]


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            "theme",
            "medication_reminders",
            "missed_dose_alerts",
            "refill_alerts",
            "system_notifications",
            "reminder_sound",
            "reminder_lead_time",
            "language",
            "time_format",
            "date_format",
            "updated_at",
        ]
        read_only_fields = [
            "updated_at",
        ]

    def validate_reminder_lead_time(self, value):
        allowed_values = [
            5,
            10,
            15,
            30,
            60,
        ]

        if value not in allowed_values:
            raise serializers.ValidationError(
                "Reminder lead time must be 5, 10, 15, 30, or 60 minutes."
            )

        return value


class SendEmailVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(
        required=False,
        allow_blank=False,
    )


class VerifyEmailSerializer(serializers.Serializer):
    code = serializers.CharField(
        min_length=6,
        max_length=6,
    )

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "Verification code must contain only numbers."
            )

        return value


class SendPhoneVerificationSerializer(serializers.Serializer):
    phone_number = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=20,
    )


class VerifyPhoneSerializer(serializers.Serializer):
    code = serializers.CharField(
        min_length=6,
        max_length=6,
    )

    def validate_code(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "Verification code must contain only numbers."
            )

        return value


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(
            email__iexact=value
        ).exists():
            raise serializers.ValidationError(
                "No account is registered with this email address."
            )

        return value


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    def validate(self, data):
        try:
            user = User.objects.get(
                pk=data["uid"]
            )
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid user."
            )

        if not default_token_generator.check_token(
            user,
            data["token"],
        ):
            raise serializers.ValidationError(
                "Invalid or expired reset token."
            )

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]

        user.set_password(
            self.validated_data["password"]
        )

        user.save()

        return user