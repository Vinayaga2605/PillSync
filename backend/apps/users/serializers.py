from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "No account is registered with this email address."
            )

        return value


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    def validate(self, data):
        try:
            user = User.objects.get(pk=data["uid"])
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid user.")

        if not default_token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError("Invalid or expired reset token.")

        data["user"] = user
        return data

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save()

        return user