from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import (
    urlsafe_base64_encode,
    urlsafe_base64_decode,
)
from django.conf import settings

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)


# =========================================================
# 1. REGISTER
# =========================================================

class RegisterView(generics.CreateAPIView):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer

    permission_classes = [AllowAny]


# =========================================================
# 2. LOGIN
# =========================================================

class LoginView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        # Get login input and password
        login = request.data.get("login")
        password = request.data.get("password")

        # Check required fields
        if not login or not password:

            return Response(
                {
                    "message": "Email/username and password are required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # LOGIN USING EMAIL
        # -------------------------------------------------

        if "@" in login:

            try:

                user = User.objects.get(
                    email__iexact=login
                )

                username = user.username

            except User.DoesNotExist:

                return Response(
                    {
                        "message": "Invalid email or password."
                    },
                    status=status.HTTP_401_UNAUTHORIZED
                )

        # -------------------------------------------------
        # LOGIN USING USERNAME
        # -------------------------------------------------

        else:

            username = login

        # -------------------------------------------------
        # AUTHENTICATE USER
        # -------------------------------------------------

        user = authenticate(
            username=username,
            password=password
        )

        if user is None:

            return Response(
                {
                    "message": "Invalid username/email or password."
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # -------------------------------------------------
        # CREATE JWT TOKENS
        # -------------------------------------------------

        refresh = RefreshToken.for_user(user)

        access_token = refresh.access_token

        # -------------------------------------------------
        # LOGIN SUCCESS
        # -------------------------------------------------

        return Response(
            {
                "message": "Login successful",

                "access": str(access_token),

                "refresh": str(refresh),

                "username": user.username,

                "email": user.email
            },
            status=status.HTTP_200_OK
        )


# =========================================================
# 3. PROFILE
# =========================================================

class ProfileView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        return Response(
            {
                "message": "JWT authentication successful",

                "username": request.user.username,

                "email": request.user.email
            },
            status=status.HTTP_200_OK
        )


# =========================================================
# 4. LOGOUT
# =========================================================

class LogoutView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        try:

            refresh_token = request.data.get("refresh")

            if not refresh_token:

                return Response(
                    {
                        "error": "Refresh token is required."
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = RefreshToken(refresh_token)

            token.blacklist()

            return Response(
                {
                    "message": "Logout successful."
                },
                status=status.HTTP_200_OK
            )

        except Exception:

            return Response(
                {
                    "error": "Invalid refresh token."
                },
                status=status.HTTP_400_BAD_REQUEST
            )


# =========================================================
# 5. FORGOT PASSWORD
# =========================================================

class ForgotPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        # Validate email
        serializer = ForgotPasswordSerializer(
            data=request.data
        )

        if not serializer.is_valid():

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data["email"]

        # Find user
        try:

            user = User.objects.get(
                email__iexact=email
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error": "No account found with this email address."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # -------------------------------------------------
        # CREATE RESET TOKEN
        # -------------------------------------------------

        token = default_token_generator.make_token(user)

        # Encode user ID
        uid = urlsafe_base64_encode(
            force_bytes(user.pk)
        )

        # -------------------------------------------------
        # CREATE RESET LINK
        # -------------------------------------------------

        reset_link = (
            f"http://localhost:5173/reset-password/"
            f"?uid={uid}&token={token}"
        )

        # -------------------------------------------------
        # SEND EMAIL
        # -------------------------------------------------

        send_mail(
            subject="PillSync Password Reset",

            message=(
                f"Hello {user.username},\n\n"

                f"We received a request to reset your "
                f"PillSync password.\n\n"

                f"Click the link below to create a new password:\n\n"

                f"{reset_link}\n\n"

                f"If you did not request this password reset, "
                f"please ignore this email.\n\n"

                f"Regards,\n"
                f"PillSync Team"
            ),

            from_email=settings.EMAIL_HOST_USER,

            recipient_list=[email],

            fail_silently=False,
        )

        return Response(
            {
                "message": "Password reset link sent to your email."
            },
            status=status.HTTP_200_OK
        )


# =========================================================
# 6. RESET PASSWORD
# =========================================================

class ResetPasswordView(APIView):

    permission_classes = [AllowAny]

    def post(self, request):

        # Get data
        uid = request.data.get("uid")

        token = request.data.get("token")

        new_password = request.data.get(
            "new_password"
        )

        confirm_password = request.data.get(
            "confirm_password"
        )

        # -------------------------------------------------
        # CHECK UID AND TOKEN
        # -------------------------------------------------

        if not uid or not token:

            return Response(
                {
                    "error": "Invalid reset link."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # CHECK PASSWORDS
        # -------------------------------------------------

        if not new_password or not confirm_password:

            return Response(
                {
                    "error": "Please enter both passwords."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # CHECK PASSWORD MATCH
        # -------------------------------------------------

        if new_password != confirm_password:

            return Response(
                {
                    "error": "Passwords do not match."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # CHECK PASSWORD LENGTH
        # -------------------------------------------------

        if len(new_password) < 8:

            return Response(
                {
                    "error": "Password must contain at least 8 characters."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # DECODE USER ID
        # -------------------------------------------------

        try:

            user_id = urlsafe_base64_decode(
                uid
            ).decode()

            user = User.objects.get(
                pk=user_id
            )

        except (
            User.DoesNotExist,
            ValueError,
            TypeError,
            OverflowError
        ):

            return Response(
                {
                    "error": "Invalid user."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # CHECK RESET TOKEN
        # -------------------------------------------------

        if not default_token_generator.check_token(
            user,
            token
        ):

            return Response(
                {
                    "error": "Invalid or expired reset link."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # -------------------------------------------------
        # CHANGE PASSWORD
        # -------------------------------------------------

        user.set_password(
            new_password
        )

        user.save()

        return Response(
            {
                "message": "Password changed successfully."
            },
            status=status.HTTP_200_OK
        )