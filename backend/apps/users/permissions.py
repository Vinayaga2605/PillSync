from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    """
    Allows access only to authenticated users
    whose role is patient.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "patient"
        )
