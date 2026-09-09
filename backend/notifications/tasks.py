from django.utils import timezone

from medications.models import Medication
from notifications.models import Notification


def check_medicine_reminders():
    """
    Check active medications and create medicine
    reminders when the scheduled time is reached.
    """

    now = timezone.localtime()
    today = now.date()
    current_time = now.time().replace(
        second=0,
        microsecond=0
    )

    medications = Medication.objects.filter(
        is_active=True,
        start_date__lte=today
    )

    created_count = 0

    for medication in medications:

        if medication.end_date and medication.end_date < today:
            continue

        medication_time = medication.time.replace(
            second=0,
            microsecond=0
        )

        if medication_time == current_time:

            already_exists = Notification.objects.filter(
                user=medication.user,
                medication=medication,
                notification_type="medicine",
                created_at__date=today
            ).exists()

            if not already_exists:

                Notification.objects.create(
                    user=medication.user,
                    medication=medication,
                    notification_type="medicine",
                    title="Medicine Reminder",
                    message=(
                        f"Time to take "
                        f"{medication.name} "
                        f"{medication.dosage}."
                    )
                )

                created_count += 1

    return created_count