from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth import authenticate
from django.utils.encoding import force_bytes, force_str
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from .models import (
    LoginHistory,
    SystemLog,
    User,
    UserSettings,
)

from .serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    UserSettingsSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        UserSettings.objects.get_or_create(
            user=user
        )

        refresh = RefreshToken.for_user(
            user
        )

        return Response(
            {
                "user": UserSerializer(
                    user
                ).data,
                "access": str(
                    refresh.access_token
                ),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data[
            "user"
        ]

        UserSettings.objects.get_or_create(
            user=user
        )

        ip_address = request.META.get(
            "REMOTE_ADDR"
        )

        LoginHistory.objects.create(
            user=user,
            success=True,
            ip_address=ip_address,
        )

        SystemLog.objects.create(
            user=user,
            action="login",
            details=(
                f"User {user.username} "
                "logged in successfully."
            ),
        )

        refresh = RefreshToken.for_user(
            user
        )

        return Response(
            {
                "user": UserSerializer(
                    user
                ).data,
                "access": str(
                    refresh.access_token
                ),
                "refresh": str(refresh),
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            UserSerializer(
                request.user
            ).data
        )

    def patch(self, request):
        user = request.user

        allowed_fields = {
            "email",
            "phone_number",
            "date_of_birth",
        }

        update_data = {
            key: value
            for key, value in request.data.items()
            if key in allowed_fields
        }

        if not update_data:
            return Response(
                {
                    "error": (
                        "No valid profile fields "
                        "were provided."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "email" in update_data:
            update_data["email"] = (
                update_data["email"] or ""
            ).strip()

        if "phone_number" in update_data:
            update_data["phone_number"] = (
                update_data["phone_number"] or ""
            ).strip()

        serializer = UserSerializer(
            user,
            data=update_data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        SystemLog.objects.create(
            user=user,
            action="profile_update",
            details=(
                f"Profile updated for "
                f"user {user.username}."
            ),
        )

        return Response(
            UserSerializer(user).data,
            status=status.HTTP_200_OK,
        )


class SettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_settings(self, user):
        settings_object, created = (
            UserSettings.objects.get_or_create(
                user=user
            )
        )

        if created:
            SystemLog.objects.create(
                user=user,
                action="settings_created",
                details=(
                    f"Default settings created "
                    f"for user {user.username}."
                ),
            )

        return settings_object

    def get(self, request):
        settings_object = (
            self.get_settings(
                request.user
            )
        )

        serializer = UserSettingsSerializer(
            settings_object
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        settings_object = (
            self.get_settings(
                request.user
            )
        )

        serializer = UserSettingsSerializer(
            settings_object,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        SystemLog.objects.create(
            user=request.user,
            action="settings_update",
            details=(
                f"Settings updated for "
                f"user {request.user.username}."
            ),
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data[
            "email"
        ]

        user = User.objects.get(
            email__iexact=email
        )

        token = (
            default_token_generator.make_token(
                user
            )
        )

        uid = urlsafe_base64_encode(
            force_bytes(user.pk)
        )

        reset_link = (
            "http://localhost:5173/"
            "reset-password/"
            f"?uid={uid}&token={token}"
        )

        return Response(
            {
                "message": (
                    "Password reset link generated."
                ),
                "reset_link": reset_link,
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        new_password = request.data.get(
            "new_password"
        )
        confirm_password = request.data.get(
            "confirm_password"
        )

        if not uid or not token:
            return Response(
                {
                    "error": (
                        "Invalid reset link."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            not new_password
            or not confirm_password
        ):
            return Response(
                {
                    "error": (
                        "Please enter both passwords."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return Response(
                {
                    "error": (
                        "Passwords do not match."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(new_password) < 8:
            return Response(
                {
                    "error": (
                        "Password must contain "
                        "at least 8 characters."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user_id = force_str(
                urlsafe_base64_decode(uid)
            )

            user = User.objects.get(
                pk=user_id
            )

        except (
            User.DoesNotExist,
            ValueError,
            TypeError,
            OverflowError,
        ):
            return Response(
                {
                    "error": "Invalid user."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(
            user,
            token,
        ):
            return Response(
                {
                    "error": (
                        "Invalid or expired "
                        "reset link."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(
            new_password
        )

        user.save(
            update_fields=[
                "password"
            ]
        )

        SystemLog.objects.create(
            user=user,
            action="password_reset",
            details=(
                f"Password reset successfully "
                f"for user {user.username}."
            ),
        )

        return Response(
            {
                "message": (
                    "Password reset successfully."
                )
            },
            status=status.HTTP_200_OK,
        )
