from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        show_history = (
            request.query_params.get("history") == "true"
        )

        if show_history:
            notifications = Notification.objects.filter(
                user=request.user
            )
        else:
            notifications = Notification.objects.filter(
                user=request.user,
                is_archived=False
            )

        notifications = notifications[:100]

        return Response(
            NotificationSerializer(
                notifications,
                many=True
            ).data
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                user=request.user,
                is_archived=False
            )
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response(
            NotificationSerializer(notification).data
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        Notification.objects.filter(
            user=request.user,
            is_archived=False,
            is_read=False
        ).update(is_read=True)

        return Response(
            {"detail": "All notifications marked as read"}
        )


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(
                pk=pk,
                user=request.user,
                is_archived=False
            )
        except Notification.DoesNotExist:
            return Response(
                {"detail": "Not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        notification.is_archived = True
        notification.save(update_fields=["is_archived"])

        return Response(
            {"detail": "Notification archived"},
            status=status.HTTP_204_NO_CONTENT
        )


class NotificationClearView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        Notification.objects.filter(
            user=request.user,
            is_archived=False
        ).update(is_archived=True)

        return Response(
            {"detail": "All notifications archived"},
            status=status.HTTP_204_NO_CONTENT
        )