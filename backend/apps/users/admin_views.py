from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import status

from .models import User, CaregiverAssignment
from apps.medications.models import Medication
from apps.adherence.models import DoseLog


def _require_admin(user):
    if user.role != User.Role.ADMIN:
        raise PermissionDenied("Admin access required.")


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        users = User.objects.all().order_by("-date_joined")

        search = request.query_params.get("search", "").strip()
        role = request.query_params.get("role", "").strip()
        active = request.query_params.get("active", "").strip()

        if search:
            users = users.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        if role:
            users = users.filter(role=role)

        if active.lower() in ["true", "false"]:
            users = users.filter(is_active=active.lower() == "true")

        data = [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.get_full_name() or u.username,
                "email": u.email,
                "role": u.role,
                "phone": u.phone_number,
                "isActive": u.is_active,
                "dateJoined": u.date_joined.strftime("%b %d, %Y"),
            }
            for u in users
        ]

        return Response({
            "users": data,
            "total": len(data),
            "pages": 1,
        })


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        medications = Medication.objects.filter(patient=user)

        data = {
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "email": user.email,
            "role": user.role,
            "phone": user.phone_number,
            "isActive": user.is_active,
            "dateJoined": user.date_joined.strftime("%b %d, %Y"),
            "profile": {
                "dob": user.date_of_birth,
                "gender": None,
                "blood_group": None,
                "emergency_contact": None,
            },
            "medications": [
                {
                    "id": m.id,
                    "name": m.name,
                    "dosage": m.dosage,
                    "frequency": m.frequency,
                    "remaining_stock": m.remaining_stock,
                }
                for m in medications
            ],
            "conditions": [
                m.condition
                for m in medications
                if m.condition
            ],
        }

        return Response(data)


class AdminUserCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        _require_admin(request.user)

        username = request.data.get("username")
        email = request.data.get("email", "")
        password = request.data.get("password")
        role = request.data.get("role", User.Role.PATIENT)
        phone = request.data.get("phone", "")
        full_name = request.data.get("full_name", "")

        if not username or not password:
            return Response(
                {"detail": "Username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in User.Role.values:
            return Response(
                {"detail": "Invalid role."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            phone_number=phone,
        )

        parts = full_name.strip().split(" ", 1)
        if parts:
            user.first_name = parts[0]
        if len(parts) > 1:
            user.last_name = parts[1]

        user.save()

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "full_name": user.get_full_name() or user.username,
                "email": user.email,
                "role": user.role,
                "phone": user.phone_number,
                "isActive": user.is_active,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        if "email" in request.data:
            user.email = request.data["email"]

        if "phone" in request.data:
            user.phone_number = request.data["phone"]

        if "role" in request.data:
            role = request.data["role"]
            if role not in User.Role.values:
                return Response(
                    {"detail": "Invalid role."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.role = role

        if "full_name" in request.data:
            parts = request.data["full_name"].strip().split(" ", 1)
            user.first_name = parts[0] if parts else ""
            user.last_name = parts[1] if len(parts) > 1 else ""

        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "full_name": user.get_full_name() or user.username,
            "email": user.email,
            "role": user.role,
            "phone": user.phone_number,
            "isActive": user.is_active,
        })


class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)

        if user.id == request.user.id:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.delete()

        return Response(
            {"message": "User deleted successfully."},
            status=status.HTTP_204_NO_CONTENT,
        )


class AdminUserToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)

        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        return Response({
            "id": user.id,
            "isActive": user.is_active,
        })


class AdminCaregiverListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        caregivers = User.objects.filter(
            role=User.Role.CAREGIVER,
            is_active=True,
        ).order_by("username")

        return Response([
            {
                "id": c.id,
                "user_id": c.id,
                "username": c.username,
                "full_name": c.get_full_name() or c.username,
                "email": c.email,
            }
            for c in caregivers
        ])


class AdminAssignCaregiverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id):
        _require_admin(request.user)

        caregiver_id = request.data.get("caregiver_id")

        try:
            patient = User.objects.get(
                pk=patient_id,
                role=User.Role.PATIENT,
            )
            caregiver = User.objects.get(
                pk=caregiver_id,
                role=User.Role.CAREGIVER,
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Patient or caregiver not found."},
                status=404,
            )

        assignment, created = CaregiverAssignment.objects.get_or_create(
            patient=patient,
            caregiver=caregiver,
        )

        return Response({
            "message": "Caregiver assigned successfully.",
            "created": created,
            "patient_id": patient.id,
            "caregiver_id": caregiver.id,
        })


class AdminSystemStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        total_users = User.objects.count()
        total_patients = User.objects.filter(
            role=User.Role.PATIENT
        ).count()
        total_caregivers = User.objects.filter(
            role=User.Role.CAREGIVER
        ).count()
        total_admins = User.objects.filter(
            role=User.Role.ADMIN
        ).count()

        total_medications = Medication.objects.count()
        total_doses = DoseLog.objects.count()
        taken = DoseLog.objects.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        overall_adherence = (
            round((taken / total_doses) * 100)
            if total_doses else 0
        )

        return Response({
            "totalUsers": total_users,
            "totalPatients": total_patients,
            "totalCaregivers": total_caregivers,
            "totalAdmins": total_admins,
            "totalMedications": total_medications,
            "overallAdherence": overall_adherence,
        })
