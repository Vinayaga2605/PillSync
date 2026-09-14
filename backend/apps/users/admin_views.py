from django.db.models import Q
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework import status

from .models import (
    User,
    CaregiverAssignment,
    LoginHistory,
    SystemLog,
)

from apps.medications.models import Medication
from apps.adherence.models import DoseLog
from apps.notifications.models import (
    Notification,
    NotificationLog,
)


def _require_admin(user):
    if user.role != User.Role.ADMIN:
        raise PermissionDenied("Admin access required.")


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        users = User.objects.all().order_by("-date_joined")

        search = request.query_params.get(
            "search",
            "",
        ).strip()

        role = request.query_params.get(
            "role",
            "",
        ).strip()

        active = request.query_params.get(
            "active",
            "",
        ).strip()

        if search:
            users = users.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        if role:
            users = users.filter(
                role=role
            )

        if active.lower() in ["true", "false"]:
            users = users.filter(
                is_active=active.lower() == "true"
            )

        data = [
            {
                "id": u.id,
                "username": u.username,
                "full_name": (
                    u.get_full_name()
                    or u.username
                ),
                "email": u.email,
                "role": u.role,
                "phone": u.phone_number,
                "isActive": u.is_active,
                "dateJoined": u.date_joined.strftime(
                    "%b %d, %Y"
                ),
            }
            for u in users
        ]

        return Response(
            {
                "users": data,
                "total": len(data),
                "pages": 1,
            }
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(
                pk=user_id
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        medications = Medication.objects.filter(
            patient=user
        )

        data = {
            "id": user.id,
            "username": user.username,
            "full_name": (
                user.get_full_name()
                or user.username
            ),
            "email": user.email,
            "role": user.role,
            "phone": user.phone_number,
            "isActive": user.is_active,
            "dateJoined": user.date_joined.strftime(
                "%b %d, %Y"
            ),
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
                    "remaining_stock": (
                        m.remaining_stock
                    ),
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

        username = request.data.get(
            "username"
        )

        email = request.data.get(
            "email",
            "",
        )

        password = request.data.get(
            "password"
        )

        role = request.data.get(
            "role",
            User.Role.PATIENT,
        )

        phone = request.data.get(
            "phone",
            "",
        )

        full_name = request.data.get(
            "full_name",
            "",
        )

        if not username or not password:
            return Response(
                {
                    "detail": (
                        "Username and password are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(
            username=username
        ).exists():
            return Response(
                {
                    "detail": (
                        "Username already exists."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in User.Role.values:
            return Response(
                {
                    "detail": "Invalid role."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            role=role,
            phone_number=phone,
        )

        parts = (
            full_name
            .strip()
            .split(" ", 1)
        )

        if parts:
            user.first_name = parts[0]

        if len(parts) > 1:
            user.last_name = parts[1]

        user.save()

        SystemLog.objects.create(
            user=request.user,
            action="user_created",
            details=(
                f"Created user {user.username} "
                f"with role {user.role}."
            ),
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "full_name": (
                    user.get_full_name()
                    or user.username
                ),
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
            user = User.objects.get(
                pk=user_id
            )
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if "email" in request.data:
            user.email = request.data["email"]

        if "phone" in request.data:
            user.phone_number = request.data["phone"]

        if "role" in request.data:
            role = request.data["role"]

            if role not in User.Role.values:
                return Response(
                    {
                        "detail": "Invalid role."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user.role = role

        if "full_name" in request.data:
            parts = (
                request.data["full_name"]
                .strip()
                .split(" ", 1)
            )

            user.first_name = (
                parts[0]
                if parts
                else ""
            )

            user.last_name = (
                parts[1]
                if len(parts) > 1
                else ""
            )

        user.save()

        SystemLog.objects.create(
            user=request.user,
            action="user_updated",
            details=(
                f"Updated user "
                f"{user.username}."
            ),
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "full_name": (
                    user.get_full_name()
                    or user.username
                ),
                "email": user.email,
                "role": user.role,
                "phone": user.phone_number,
                "isActive": user.is_active,
            }
        )


class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(
                pk=user_id
            )
        except User.DoesNotExist:
            return Response(
                {
                    "detail": "User not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.id == request.user.id:
            return Response(
                {
                    "detail": (
                        "You cannot delete your own account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        username = user.username

        SystemLog.objects.create(
            user=request.user,
            action="user_deleted",
            details=(
                f"Deleted user {username}."
            ),
        )

        user.delete()

        return Response(
            {
                "message": (
                    "User deleted successfully."
                )
            },
            status=status.HTTP_204_NO_CONTENT,
        )


class AdminUserToggleActiveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        _require_admin(request.user)

        try:
            user = User.objects.get(
                pk=user_id
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user.is_active = not user.is_active

        user.save(
            update_fields=[
                "is_active"
            ]
        )

        SystemLog.objects.create(
            user=request.user,
            action="user_status_updated",
            details=(
                f"Set {user.username} active="
                f"{user.is_active}."
            ),
        )

        return Response(
            {
                "id": user.id,
                "isActive": user.is_active,
            }
        )


class AdminCaregiverListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        caregivers = (
            User.objects
            .filter(
                role=User.Role.CAREGIVER,
                is_active=True,
            )
            .order_by("username")
        )

        return Response(
            [
                {
                    "id": c.id,
                    "user_id": c.id,
                    "username": c.username,
                    "full_name": (
                        c.get_full_name()
                        or c.username
                    ),
                    "email": c.email,
                }
                for c in caregivers
            ]
        )


class AdminAssignCaregiverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id):
        _require_admin(request.user)

        caregiver_id = request.data.get(
            "caregiver_id"
        )

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
                {
                    "detail": (
                        "Patient or caregiver not found."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        assignment, created = (
            CaregiverAssignment.objects
            .get_or_create(
                patient=patient,
                caregiver=caregiver,
            )
        )

        SystemLog.objects.create(
            user=request.user,
            action="caregiver_assigned",
            details=(
                f"Assigned caregiver "
                f"{caregiver.username} to "
                f"{patient.username}."
            ),
        )

        return Response(
            {
                "message": (
                    "Caregiver assigned successfully."
                ),
                "created": created,
                "patient_id": patient.id,
                "caregiver_id": caregiver.id,
            }
        )


class AdminSystemStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        today = timezone.localdate()

        # --------------------------------------------------
        # USER COUNTS
        # --------------------------------------------------

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

        # --------------------------------------------------
        # MEDICATION COUNTS
        # --------------------------------------------------

        medications = Medication.objects.all()

        total_medications = medications.count()

        low_stock_queryset = (
            medications
            .filter(
                remaining_stock__lte=5
            )
            .select_related("patient")
            .order_by(
                "remaining_stock",
                "name",
            )
        )

        critical_stock_queryset = (
            medications
            .filter(
                remaining_stock__lte=2
            )
            .select_related("patient")
            .order_by(
                "remaining_stock",
                "name",
            )
        )

        low_stock_count = (
            low_stock_queryset.count()
        )

        critical_stock_count = (
            critical_stock_queryset.count()
        )

        # --------------------------------------------------
        # TODAY'S DOSES
        # --------------------------------------------------

        today_logs = DoseLog.objects.filter(
            scheduled_date=today
        )

        scheduled_doses_today = (
            today_logs.count()
        )

        taken_today = today_logs.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        missed_today = today_logs.filter(
            status=DoseLog.Status.MISSED
        ).count()

        pending_today = today_logs.filter(
            status=DoseLog.Status.PENDING
        ).count()

        # --------------------------------------------------
        # OVERALL ADHERENCE
        # --------------------------------------------------

        total_doses = DoseLog.objects.count()

        taken_doses = DoseLog.objects.filter(
            status=DoseLog.Status.TAKEN
        ).count()

        overall_adherence = (
            round(
                (
                    taken_doses
                    / total_doses
                )
                * 100
            )
            if total_doses
            else 0
        )

        # --------------------------------------------------
        # TODAY'S NOTIFICATIONS
        # --------------------------------------------------

        today_notifications = Notification.objects.filter(
            created_at__date=today
        )

        notifications_today = (
            today_notifications.count()
        )

        unread_notifications = Notification.objects.filter(
            is_read=False
        ).count()

        pending_notifications = (
            unread_notifications
        )

        # --------------------------------------------------
        # NOTIFICATION DELIVERY
        # --------------------------------------------------

        notification_logs_today = (
            NotificationLog.objects.filter(
                created_at__date=today
            )
        )

        notification_sent_today = (
            notification_logs_today
            .filter(
                status__iexact="sent"
            )
            .count()
        )

        notification_failed_today = (
            notification_logs_today
            .filter(
                status__iexact="failed"
            )
            .count()
        )

        # --------------------------------------------------
        # RECENT ACTIVITY
        # --------------------------------------------------

        recent_logs = (
            SystemLog.objects
            .select_related("user")
            .order_by("-created_at")[:8]
        )

        recent_activity = [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "user": (
                    log.user.get_full_name()
                    or log.user.username
                    if log.user
                    else "System"
                ),
                "created_at": log.created_at,
            }
            for log in recent_logs
        ]

        # --------------------------------------------------
        # LOW STOCK MEDICINES
        # --------------------------------------------------

        low_stock_medicines = [
            {
                "id": medication.id,
                "name": medication.name,
                "remaining_stock": (
                    medication.remaining_stock
                ),
                "patient_id": medication.patient_id,
                "patient_name": (
                    medication.patient.get_full_name()
                    or medication.patient.username
                ),
                "status": (
                    "critical"
                    if medication.remaining_stock <= 2
                    else "low"
                ),
            }
            for medication in low_stock_queryset[:10]
        ]

        # --------------------------------------------------
        # SYSTEM HEALTH
        # --------------------------------------------------

        if critical_stock_count > 0:
            system_status = "Attention Required"
        else:
            system_status = "Healthy"

        return Response(
            {
                # Existing fields
                "totalUsers": total_users,
                "totalPatients": total_patients,
                "totalCaregivers": total_caregivers,
                "totalAdmins": total_admins,
                "totalMedications": total_medications,
                "overallAdherence": overall_adherence,

                # Today's dashboard data
                "scheduledDosesToday": (
                    scheduled_doses_today
                ),
                "takenToday": taken_today,
                "missedToday": missed_today,
                "pendingToday": pending_today,

                # Notifications
                "notificationsToday": (
                    notifications_today
                ),
                "unreadNotifications": (
                    unread_notifications
                ),
                "pendingNotifications": (
                    pending_notifications
                ),
                "notificationSentToday": (
                    notification_sent_today
                ),
                "notificationFailedToday": (
                    notification_failed_today
                ),

                # Stock
                "lowStockCount": low_stock_count,
                "criticalStockCount": (
                    critical_stock_count
                ),
                "lowStockMedicines": (
                    low_stock_medicines
                ),

                # Health
                "systemStatus": system_status,
                "databaseConnected": True,
                "apiAvailable": True,

                # Recent activity
                "recentActivity": recent_activity,
            }
        )


class AdminSystemLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        logs = (
            SystemLog.objects
            .select_related("user")
            .all()[:100]
        )

        data = [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at,
                "user_name": (
                    log.user.get_full_name()
                    or log.user.username
                    if log.user
                    else "System"
                ),
            }
            for log in logs
        ]

        return Response(data)


class AdminLoginHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        history = (
            LoginHistory.objects
            .select_related("user")
            .all()[:100]
        )

        data = [
            {
                "id": item.id,
                "email": item.user.email,
                "username": item.user.username,
                "role": item.user.role,
                "ip_address": item.ip_address,
                "created_at": item.created_at,
                "success": item.success,
            }
            for item in history
        ]

        return Response(data)


class AdminNotificationLogsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _require_admin(request.user)

        logs = (
            NotificationLog.objects
            .select_related(
                "notification",
                "user",
            )
            .all()[:100]
        )

        data = [
            {
                "id": log.id,
                "message": (
                    log.notification.message
                    if log.notification
                    else None
                ),
                "title": (
                    log.notification.title
                    if log.notification
                    else None
                ),
                "created_at": log.created_at,
                "channel": log.channel,
                "status": log.status,
            }
            for log in logs
        ]

        return Response(data)