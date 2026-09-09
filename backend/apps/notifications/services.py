from notifications.models import Notification
from medications.models import Medication


def create_medicine_reminder(medication):
    """
    Create a medicine reminder notification
    for a specific medication.
    """

    notification, created = Notification.objects.get_or_create(
        user=medication.user,
        medication=medication,
        notification_type="medicine",
        title="Medicine Reminder",
        message=f"Time to take {medication.name} {medication.dosage}."
    )

    return notification