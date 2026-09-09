from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer


# 1. Get all notifications for logged-in user
class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(
            user=request.user
        ).order_by("-created_at")

        serializer = NotificationSerializer(
            notifications,
            many=True
        )

        return Response(serializer.data)


# 2. Mark notification as read
class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, notification_id):

        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=request.user
            )

        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save()

        return Response({
            "message": "Notification marked as read"
        })


# 3. Delete one notification
class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):

        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=request.user
            )

        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.delete()

        return Response({
            "message": "Notification deleted"
        })


# 4. Clear all notifications
class NotificationClearAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):

        Notification.objects.filter(
            user=request.user
        ).delete()

        return Response({
            "message": "All notifications cleared"
        })


# 5. Get and update push notification preference
class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    # Get current push notification status
    def get(self, request):

        preference, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        return Response({
            "push_enabled": preference.push_enabled
        })


    # Update push notification status
    def put(self, request):

        preference, created = NotificationPreference.objects.get_or_create(
            user=request.user
        )

        preference.push_enabled = request.data.get(
            "push_enabled",
            preference.push_enabled
        )

        preference.save()

        return Response({
            "message": "Notification preference updated",
            "push_enabled": preference.push_enabled
        })
