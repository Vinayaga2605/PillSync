from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import User
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
        data = [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "role": u.role,
                "isActive": u.is_active,
                "dateJoined": u.date_joined.strftime("%b %d, %Y"),
            }
            for u in users
        ]
        return Response(data)


class AdminUserToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        _require_admin(request.user)
        try:
            u = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Not found"}, status=404)
        u.is_active = not u.is_active
        u.save()
        return Response({"id": u.id, "isActive": u.is_active})


class AdminSystemStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)
        total_users = User.objects.count()
        total_patients = User.objects.filter(role=User.Role.PATIENT).count()
        total_caregivers = User.objects.filter(role=User.Role.CAREGIVER).count()
        total_medications = Medication.objects.count()
        total_doses = DoseLog.objects.count()
        taken = DoseLog.objects.filter(status=DoseLog.Status.TAKEN).count()
        overall_adherence = round((taken / total_doses) * 100) if total_doses else 0

        return Response({
            "totalUsers": total_users,
            "totalPatients": total_patients,
            "totalCaregivers": total_caregivers,
            "totalMedications": total_medications,
            "overallAdherence": overall_adherence,
        })