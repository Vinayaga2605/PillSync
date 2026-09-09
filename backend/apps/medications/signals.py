from datetime import date, timedelta, time

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Medication
from apps.reminders.models import Reminder
from apps.adherence.models import DoseLog


def get_schedule_times(doses_per_day):
    """
    Return sensible default times based on doses per day.
    """
    schedules = {
        1: [time(8, 0)],
        2: [time(8, 0), time(20, 0)],
        3: [time(8, 0), time(14, 0), time(20, 0)],
        4: [time(8, 0), time(12, 0), time(16, 0), time(20, 0)],
    }

    return schedules.get(
        doses_per_day,
        [time(8, 0)] * doses_per_day
    )


def get_label(index, total):
    if total == 1:
        return "Daily"

    labels = ["Morning", "Afternoon", "Evening", "Night"]

    if index < len(labels):
        return labels[index]

    return f"Dose {index + 1}"


@receiver(post_save, sender=Medication)
def create_medication_schedule(sender, instance, created, **kwargs):
    """
    When a new medication is created, generate reminders and
    DoseLogs for the next 7 days.

    Existing schedules are not duplicated.
    """

    if not created:
        return

    doses_per_day = instance.doses_per_day or 1
    schedule_times = get_schedule_times(doses_per_day)

    today = date.today()

    for day_offset in range(7):
        scheduled_date = today + timedelta(days=day_offset)

        for index, scheduled_time in enumerate(schedule_times):
            label = get_label(index, len(schedule_times))

            reminder, _ = Reminder.objects.get_or_create(
                medication=instance,
                date=scheduled_date,
                time=scheduled_time,
                defaults={
                    "label": f"{label} - {instance.name}",
                    "status": Reminder.Status.PENDING,
                },
            )

            DoseLog.objects.get_or_create(
                medication=instance,
                scheduled_date=scheduled_date,
                scheduled_time=scheduled_time,
                defaults={
                    "status": DoseLog.Status.PENDING,
                },
            )