from datetime import timedelta

from decouple import config
from django.utils import timezone

from groq import Groq

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.adherence.models import DoseLog
from apps.medications.models import Medication
from apps.notifications.models import Notification
from apps.reminders.models import MedicationSchedule
from apps.users.models import CaregiverAssignment, User


GROQ_API_KEY = config("GROQ_API_KEY", default="")


# ---------------------------------------------------------
# USER DATA
# ---------------------------------------------------------

def build_user_context(user):
    today = timezone.localdate()
    thirty_days_ago = today - timedelta(days=30)

    context = {
        "user": {
            "username": user.username,
            "name": user.get_full_name() or user.username,
            "role": user.role,
        }
    }

    # ---------------- PATIENT ----------------

    if user.role == User.Role.PATIENT:
        medications = Medication.objects.filter(
            patient=user
        ).order_by("name")

        medication_data = []

        for medication in medications:
            medication_data.append(
                {
                    "id": medication.id,
                    "name": medication.name,
                    "dosage": medication.dosage,
                    "frequency": medication.frequency,
                    "doses_per_day": medication.doses_per_day,
                    "total_stock": medication.total_stock,
                    "remaining_stock": medication.remaining_stock,
                    "condition": medication.condition,
                }
            )

        schedules = (
            MedicationSchedule.objects.filter(
                medication__patient=user,
                is_active=True,
            )
            .select_related("medication")
            .prefetch_related("schedule_times")
        )

        schedule_data = []

        for schedule in schedules:
            if (
                schedule.start_date
                and today < schedule.start_date
            ):
                continue

            if (
                schedule.end_date
                and today > schedule.end_date
            ):
                continue

            times = []

            for schedule_time in schedule.schedule_times.all():
                times.append(
                    {
                        "time": schedule_time.scheduled_time.strftime(
                            "%H:%M"
                        ),
                        "time_of_day": (
                            schedule_time.time_of_day_type
                        ),
                        "dose_quantity": str(
                            schedule_time.dose_quantity
                            or schedule.dose_quantity
                        ),
                    }
                )

            schedule_data.append(
                {
                    "medicine": schedule.medication.name,
                    "frequency_type": schedule.frequency_type,
                    "dose_quantity": str(
                        schedule.dose_quantity
                    ),
                    "dosage_unit": schedule.dosage_unit,
                    "days_of_week": schedule.days_of_week or [],
                    "times": times,
                    "instructions": (
                        schedule.instructions or ""
                    ),
                }
            )

        recent_doses = (
            DoseLog.objects.filter(
                medication__patient=user,
                scheduled_date__gte=thirty_days_ago,
                scheduled_date__lte=today,
            )
            .select_related("medication")
            .order_by(
                "-scheduled_date",
                "-scheduled_time",
            )[:50]
        )

        dose_data = []

        for dose in recent_doses:
            dose_data.append(
                {
                    "medicine": dose.medication.name,
                    "date": str(dose.scheduled_date),
                    "time": dose.scheduled_time.strftime(
                        "%H:%M"
                    ),
                    "status": dose.status,
                }
            )

        notifications = (
            Notification.objects.filter(
                user=user,
                is_archived=False,
            )
            .order_by("-id")[:20]
        )

        notification_data = [
            {
                "title": notification.title,
                "message": notification.message,
                "read": notification.is_read,
                "type": notification.type,
            }
            for notification in notifications
        ]

        context["patient_data"] = {
            "medications": medication_data,
            "active_schedules": schedule_data,
            "recent_doses": dose_data,
            "notifications": notification_data,
        }

    # ---------------- CAREGIVER ----------------

    elif user.role == User.Role.CAREGIVER:
        assignments = (
            CaregiverAssignment.objects.filter(
                caregiver=user
            )
            .select_related("patient")
        )

        patients = []

        for assignment in assignments:
            patient = assignment.patient

            medications = Medication.objects.filter(
                patient=patient
            ).order_by("name")

            patient_medications = []

            for medication in medications:
                patient_medications.append(
                    {
                        "name": medication.name,
                        "dosage": medication.dosage,
                        "frequency": medication.frequency,
                        "remaining_stock": (
                            medication.remaining_stock
                        ),
                    }
                )

            missed_count = DoseLog.objects.filter(
                medication__patient=patient,
                scheduled_date__gte=thirty_days_ago,
                scheduled_date__lte=today,
                status=DoseLog.Status.MISSED,
            ).count()

            patients.append(
                {
                    "name": (
                        patient.get_full_name()
                        or patient.username
                    ),
                    "username": patient.username,
                    "medications": patient_medications,
                    "missed_doses_last_30_days": (
                        missed_count
                    ),
                }
            )

        context["caregiver_data"] = {
            "assigned_patients": patients,
        }

    # ---------------- ADMIN ----------------

    elif user.role == User.Role.ADMIN:
        context["admin_data"] = {
            "total_users": User.objects.count(),
            "patients": User.objects.filter(
                role=User.Role.PATIENT
            ).count(),
            "caregivers": User.objects.filter(
                role=User.Role.CAREGIVER
            ).count(),
            "admins": User.objects.filter(
                role=User.Role.ADMIN
            ).count(),
            "medications": Medication.objects.count(),
            "dose_logs_last_30_days": (
                DoseLog.objects.filter(
                    scheduled_date__gte=thirty_days_ago,
                    scheduled_date__lte=today,
                ).count()
            ),
        }

    return context


# ---------------------------------------------------------
# AI SYSTEM PROMPT
# ---------------------------------------------------------

def get_system_prompt(role):
    return f"""
You are PillSync AI, a medical and medication assistant
inside the PillSync application.

CURRENT USER ROLE:
{role}

============================================================
DOMAIN RESTRICTION
============================================================

You are ONLY allowed to answer questions related to:

- medicines
- medications
- drugs
- tablets
- capsules
- syrups
- injections
- dosage information
- medicine frequency
- medication timing
- side effects
- precautions
- medication interactions
- medication storage
- medication adherence
- missed doses
- medicine stock
- refills
- prescriptions
- symptoms
- diseases
- disorders
- medical conditions
- diagnosis-related general information
- treatment-related general information
- prevention
- healthcare
- medical terminology
- medical tests
- PillSync medication-management features

============================================================
NON-MEDICAL QUESTIONS
============================================================

If the question is unrelated to medicine, disease,
healthcare, symptoms, medication, or PillSync medication
management, do NOT answer it.

Respond only:

"I can only help with medicine, disease, healthcare, and
PillSync medication-related questions."

============================================================
RESPONSE STYLE
============================================================

Keep responses SHORT and easy to read.

Default response length:
- 3 to 6 short bullets OR
- 2 to 4 short paragraphs.

Do NOT automatically create:
- large tables
- long explanations
- lengthy lists
- repeated warnings
- detailed essays

Only provide a detailed answer when the user explicitly asks
for details, examples, a full explanation, or a comprehensive
answer.

For a simple factual medicine question, answer directly.

Example:

User:
"What is paracetamol used for?"

Good response:
"Paracetamol is commonly used to reduce fever and relieve
mild to moderate pain. Follow the dose on your prescription
or package label, and avoid exceeding the recommended amount."

Do not turn simple questions into long medical articles.

============================================================
MEDICAL SAFETY
============================================================

You provide general medical information, not a diagnosis.

Never:
- claim certainty that a user has a disease
- prescribe a new medicine
- tell a user to start, stop, or change a prescribed medicine
  without appropriate clinician guidance
- invent clinical information
- invent medicine names
- invent interactions
- invent side effects
- invent patient data
- invent PillSync records

For diagnosis-related questions:
- explain possible causes
- state that symptoms alone may not establish a diagnosis
- recommend professional medical evaluation when appropriate

For medicine questions:
- explain general uses
- mention important/common side effects when relevant
- mention important precautions when relevant
- mention interaction considerations when relevant

For dosage questions:
- explain what the prescribed dosage means
- do not create a personalized prescription
- advise following the prescription label and clinician/pharmacist
  instructions

For missed doses:
- give general guidance
- advise checking the medicine-specific instructions
- do not automatically recommend doubling a dose

For emergency symptoms:
- advise immediate professional/emergency medical care

Use simple language suitable for a general user.

============================================================
PILLSYNC PERSONAL DATA
============================================================

When personal PillSync data is supplied:
- use only the supplied data
- do not expose another user's private information
- answer according to the logged-in user's role
- distinguish personal PillSync information from general
  medical knowledge

You are operating in {role} mode.
"""


# ---------------------------------------------------------
# SUGGESTIONS
# ---------------------------------------------------------

def get_default_suggestions(role):
    if role == User.Role.CAREGIVER:
        return [
            "List my assigned patients",
            "Any missed doses?",
            "Show medicine status",
        ]

    if role == User.Role.ADMIN:
        return [
            "Give me a system status",
            "How many patients are registered?",
            "Show medicine statistics",
        ]

    return [
        "What medicines do I have?",
        "Show my schedule",
        "Any missed doses?",
    ]


# ---------------------------------------------------------
# AI ASSISTANT API
# ---------------------------------------------------------

class AIAssistantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not GROQ_API_KEY:
            return Response(
                {
                    "reply": (
                        "The AI Assistant is not configured yet. "
                        "Please configure GROQ_API_KEY on the backend."
                    ),
                    "suggestions": [],
                    "action_executed": None,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        message = str(
            request.data.get("message", "")
        ).strip()

        if not message:
            return Response(
                {
                    "reply": (
                        "Please enter a medical or medication "
                        "question."
                    ),
                    "suggestions": get_default_suggestions(
                        request.user.role
                    ),
                    "action_executed": None,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        history = request.data.get("history", [])

        if not isinstance(history, list):
            history = []

        try:
            context = build_user_context(
                request.user
            )

            client = Groq(
                api_key=GROQ_API_KEY
            )

            messages = [
                {
                    "role": "system",
                    "content": (
                        get_system_prompt(
                            request.user.role
                        )
                        + "\n\nCURRENT PILLSYNC DATA:\n"
                        + str(context)
                    ),
                }
            ]

            for item in history[-6:]:
                sender = item.get("sender")
                text = item.get("message")

                if not text:
                    continue

                if sender == "user":
                    messages.append(
                        {
                            "role": "user",
                            "content": str(text),
                        }
                    )

                elif sender == "assistant":
                    messages.append(
                        {
                            "role": "assistant",
                            "content": str(text),
                        }
                    )

            messages.append(
                {
                    "role": "user",
                    "content": message,
                }
            )

            completion = (
                client.chat.completions.create(
                    model="openai/gpt-oss-20b",
                    messages=messages,
                    temperature=0.2,
                    max_completion_tokens=350,
                )
            )

            reply = (
                completion.choices[0]
                .message
                .content
                or (
                    "I couldn't generate a medical response "
                    "right now."
                )
            )

            return Response(
                {
                    "reply": reply,
                    "suggestions": get_default_suggestions(
                        request.user.role
                    ),
                    "action_executed": None,
                },
                status=status.HTTP_200_OK,
            )

        except Exception:
            return Response(
                {
                    "reply": (
                        "I couldn't connect to the medical "
                        "assistant right now. Please try again."
                    ),
                    "suggestions": get_default_suggestions(
                        request.user.role
                    ),
                    "action_executed": None,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )