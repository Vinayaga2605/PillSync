from datetime import date, timedelta
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CaregiverAssignment
from apps.medications.models import Medication
from apps.adherence.models import DoseLog


def _patient_summary(patient):
    total = DoseLog.objects.filter(medication__patient=patient).count()
    taken = DoseLog.objects.filter(medication__patient=patient, status=DoseLog.Status.TAKEN).count()
    adherence = round((taken / total) * 100) if total else 0
    conditions = Medication.objects.filter(patient=patient).exclude(condition="").values_list(
        "condition", flat=True
    ).distinct()
    return {
        "id": patient.id,
        "name": patient.get_full_name() or patient.username,
        "condition": ", ".join(conditions) or "—",
        "adherencePercentage": adherence,
    }


class CaregiverPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        assignments = CaregiverAssignment.objects.filter(caregiver=request.user).select_related("patient")
        return Response([_patient_summary(a.patient) for a in assignments])


class CaregiverPatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id):
        assignment = get_object_or_404(CaregiverAssignment, caregiver=request.user, patient_id=patient_id)
        patient = assignment.patient

        logs = DoseLog.objects.filter(medication__patient=patient)
        total = logs.count()
        taken = logs.filter(status=DoseLog.Status.TAKEN).count()
        missed = logs.filter(status=DoseLog.Status.MISSED).count()
        adherence = round((taken / total) * 100) if total else 0

        medications = [
            {
                "id": med.id,
                "name": med.name,
                "dosage": med.dosage,
                "frequency": med.frequency,
                "remainingStock": med.remaining_stock,
                "totalStock": med.total_stock,
            }
            for med in Medication.objects.filter(patient=patient)
        ]

        recent_missed = [
            {
                "id": log.id,
                "medicineName": log.medication.name,
                "date": log.scheduled_date.strftime("%b %d"),
                "time": log.scheduled_time.strftime("%I:%M %p"),
            }
            for log in logs.filter(status=DoseLog.Status.MISSED)[:5]
        ]

        age = None
        if patient.date_of_birth:
            today = date.today()
            age = today.year - patient.date_of_birth.year

        conditions = Medication.objects.filter(patient=patient).exclude(condition="").values_list(
            "condition", flat=True
        ).distinct()

        return Response({
            "id": patient.id,
            "name": patient.get_full_name() or patient.username,
            "age": age or "—",
            "condition": ", ".join(conditions) or "—",
            "adherencePercentage": adherence,
            "dosesTaken": taken,
            "dosesMissed": missed,
            "medications": medications,
            "recentMissedDoses": recent_missed,
        })


class CaregiverMissedDoseAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient_ids = CaregiverAssignment.objects.filter(caregiver=request.user).values_list(
            "patient_id", flat=True
        )
        cutoff = date.today() - timedelta(days=2)
        logs = (
            DoseLog.objects.filter(
                medication__patient_id__in=patient_ids,
                status=DoseLog.Status.MISSED,
                scheduled_date__gte=cutoff,
            )
            .select_related("medication", "medication__patient")[:20]
        )

        data = [
            {
                "id": log.id,
                "patientName": log.medication.patient.get_full_name() or log.medication.patient.username,
                "medicineName": log.medication.name,
                "time": f"{log.scheduled_time.strftime('%I:%M %p')} on {log.scheduled_date.strftime('%b %d')}",
            }
            for log in logs
        ]
        return Response(data)