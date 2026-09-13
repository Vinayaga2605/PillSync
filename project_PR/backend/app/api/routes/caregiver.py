import uuid
from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User, CaregiverProfile
from app.schemas.user import UserRole
from app.schemas.caregiver import (
    CaregiverPatientSummaryResponse,
    CaregiverPatientDetailResponse,
    CaregiverDashboardSummaryResponse,
    CaregiverNotificationResponse,
    CaregiverNotificationListResponse,
    CaregiverNotificationUnreadCountResponse,
    CaregiverPatientAttentionOverview,
)
from app.schemas.medication_intelligence import (
    PatientMedicationIntelligenceResponse,
    PatientMedicationHistoryResponse,
)
from app.schemas.medication_suggestions import PatientMedicationSuggestionsResponse
from app.schemas.medicine import MedicineResponse
from app.schemas.schedule import MedicationScheduleResponse
from app.schemas.reminder import DueMedicationEventResponse, UpcomingMedicationEventResponse
from app.schemas.dose import DoseEventResponse
from app.schemas.adherence import AdherenceSummaryResponse
from app.services import caregiver_service

router = APIRouter(prefix="/caregivers/me", tags=["Caregiver Portal"])


def get_current_caregiver(
    current_user: User = Depends(require_roles(UserRole.CAREGIVER)),
    db: Session = Depends(get_db),
) -> CaregiverProfile:
    """
    Extracts or resolves the CaregiverProfile for the authenticated caregiver session.
    """
    return caregiver_service.get_current_caregiver_profile(db, current_user)


@router.get(
    "/patients",
    response_model=List[CaregiverPatientSummaryResponse],
    status_code=status.HTTP_200_OK,
    summary="List linked patients",
    description="Returns all active patients explicitly linked to the authenticated caregiver. Requires CAREGIVER role.",
)
def list_linked_patients(
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns list of active linked patients.
    """
    return caregiver_service.get_linked_patients(db, caregiver.id)


@router.get(
    "/dashboard/summary",
    response_model=CaregiverDashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get caregiver dashboard summary",
    description="Returns aggregate summary metrics across all active linked patients. Requires CAREGIVER role.",
)
def get_dashboard_summary(
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Calculates aggregated statistics for the caregiver dashboard.
    """
    return caregiver_service.get_caregiver_dashboard_summary(db, caregiver.id)


@router.get(
    "/patients/{patient_id}",
    response_model=CaregiverPatientDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient details",
    description="Returns safe patient profile details for a linked patient. Returns 404 if not linked. Requires CAREGIVER role.",
)
def get_linked_patient_details(
    patient_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Retrieves detailed info for a single linked patient.
    """
    return caregiver_service.get_linked_patient_by_id(db, caregiver.id, patient_id)


@router.get(
    "/patients/{patient_id}/medications",
    response_model=List[MedicineResponse],
    status_code=status.HTTP_200_OK,
    summary="Get linked patient medications",
    description="Returns active and historical medications belonging to the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_medications(
    patient_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns patient medications.
    """
    return caregiver_service.get_patient_medications(db, caregiver.id, patient_id)


@router.get(
    "/patients/{patient_id}/schedules",
    response_model=List[MedicationScheduleResponse],
    status_code=status.HTTP_200_OK,
    summary="Get linked patient schedules",
    description="Returns all medication schedules for the linked patient's medications. Requires CAREGIVER role.",
)
def get_linked_patient_schedules(
    patient_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns medication schedules.
    """
    return caregiver_service.get_patient_schedules(db, caregiver.id, patient_id)


@router.get(
    "/patients/{patient_id}/reminders/due",
    response_model=List[DueMedicationEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get linked patient due reminders",
    description="Returns currently due medication reminders for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_due_reminders(
    patient_id: uuid.UUID,
    reference_time: Optional[datetime] = Query(None, description="Optional reference datetime ISO string"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns due reminders for the linked patient.
    """
    return caregiver_service.get_patient_reminders_due(
        db, caregiver.id, patient_id, reference_datetime=reference_time
    )


@router.get(
    "/patients/{patient_id}/reminders/upcoming",
    response_model=List[UpcomingMedicationEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get linked patient upcoming reminders",
    description="Returns upcoming medication reminders within the lookahead window for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_upcoming_reminders(
    patient_id: uuid.UUID,
    reference_time: Optional[datetime] = Query(None, description="Optional reference datetime ISO string"),
    hours_ahead: int = Query(24, ge=1, le=168, description="Lookahead window in hours (1-168)"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns upcoming reminders for the linked patient.
    """
    return caregiver_service.get_patient_reminders_upcoming(
        db, caregiver.id, patient_id, reference_datetime=reference_time, hours_ahead=hours_ahead
    )


@router.get(
    "/patients/{patient_id}/doses",
    response_model=List[DoseEventResponse],
    status_code=status.HTTP_200_OK,
    summary="Get linked patient dose history",
    description="Returns dose history for the linked patient with optional date and status filters. Requires CAREGIVER role.",
)
def get_linked_patient_doses(
    patient_id: uuid.UUID,
    target_date: Optional[date] = Query(None, description="Target calendar date filter (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter (TAKEN, SKIPPED, PENDING)"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns dose event history for the linked patient.
    """
    return caregiver_service.get_patient_doses(
        db, caregiver.id, patient_id, target_date=target_date, status_filter=status_filter
    )


@router.get(
    "/patients/{patient_id}/adherence/today",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient today's adherence",
    description="Calculates today's adherence statistics for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_today_adherence(
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns today's adherence for the linked patient.
    """
    return caregiver_service.get_patient_adherence_today(
        db, caregiver.id, patient_id, medicine_id=medicine_id
    )


@router.get(
    "/patients/{patient_id}/adherence/week",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient current week's adherence",
    description="Calculates current week's adherence statistics for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_week_adherence(
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns current week's adherence for the linked patient.
    """
    return caregiver_service.get_patient_adherence_week(
        db, caregiver.id, patient_id, medicine_id=medicine_id
    )


@router.get(
    "/patients/{patient_id}/adherence/month",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient current month's adherence",
    description="Calculates current calendar month adherence statistics for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_month_adherence(
    patient_id: uuid.UUID,
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns current month's adherence for the linked patient.
    """
    return caregiver_service.get_patient_adherence_month(
        db, caregiver.id, patient_id, medicine_id=medicine_id
    )


@router.get(
    "/patients/{patient_id}/adherence",
    response_model=AdherenceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient adherence (custom range or default today)",
    description="Calculates adherence statistics for a custom date range for the linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_custom_adherence(
    patient_id: uuid.UUID,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    medicine_id: Optional[uuid.UUID] = Query(None, description="Optional medication ID filter"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns adherence over custom range or default today for the linked patient.
    """
    return caregiver_service.get_patient_adherence(
        db,
        caregiver.id,
        patient_id,
        start_date=start_date,
        end_date=end_date,
        medicine_id=medicine_id,
    )


@router.get(
    "/notifications",
    response_model=CaregiverNotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get caregiver notifications",
    description="Returns paginated notifications across all active patients linked to the caregiver.",
)
def get_caregiver_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns paginated notifications across all active linked patients.
    """
    items, total_count, unread_count = caregiver_service.get_caregiver_notifications(
        db, caregiver.id, unread_only=unread_only, limit=limit, offset=offset
    )
    return CaregiverNotificationListResponse(
        total_count=total_count,
        unread_count=unread_count,
        items=items,
    )


@router.get(
    "/notifications/unread-count",
    response_model=CaregiverNotificationUnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get caregiver unread notifications count",
    description="Returns total unread notifications count across all active patients linked to the caregiver.",
)
def get_caregiver_unread_count(
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns unread notification count across all active linked patients.
    """
    count = caregiver_service.get_caregiver_unread_notification_count(db, caregiver.id)
    return CaregiverNotificationUnreadCountResponse(unread_count=count)


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=CaregiverNotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read for caregiver",
    description="Marks a notification as read if it belongs to one of the caregiver's active linked patients.",
)
def mark_caregiver_notification_read(
    notification_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Marks a single notification as read.
    """
    return caregiver_service.mark_caregiver_notification_as_read(
        db, caregiver.id, notification_id
    )


@router.patch(
    "/notifications/read-all",
    response_model=CaregiverNotificationUnreadCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark all notifications as read for caregiver",
    description="Marks all unread notifications across the caregiver's active linked patients as read.",
)
def mark_all_caregiver_notifications_read(
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Marks all notifications across active linked patients as read.
    """
    caregiver_service.mark_all_caregiver_notifications_as_read(db, caregiver.id)
    return CaregiverNotificationUnreadCountResponse(unread_count=0)


# ==========================================
# Feature 17F: Caregiver Intelligence Endpoints
# ==========================================

@router.get(
    "/patients/{patient_id}/intelligence/summary",
    response_model=PatientMedicationIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient medication intelligence summary",
    description="Calculates deterministic, non-clinical medication intelligence and attention score for an actively linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_intelligence_summary(
    patient_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns current medication intelligence for the linked patient.
    """
    return caregiver_service.get_patient_intelligence_summary(db, caregiver.id, patient_id)


@router.get(
    "/patients/{patient_id}/intelligence/history",
    response_model=PatientMedicationHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient medication intelligence history and trends",
    description="Returns daily and weekly adherence timelines, medication-level performance, and period comparisons for an actively linked patient over 7, 30, or 90 days. Requires CAREGIVER role.",
)
def get_linked_patient_intelligence_history(
    patient_id: uuid.UUID,
    days: int = Query(30, description="Historical period in days (7, 30, or 90)"),
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns historical adherence timelines and trends for the linked patient.
    """
    return caregiver_service.get_patient_intelligence_history(db, caregiver.id, patient_id, days=days)


@router.get(
    "/patients/{patient_id}/intelligence/suggestions",
    response_model=PatientMedicationSuggestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get linked patient smart medication management suggestions",
    description="Returns deterministic, non-clinical medication management suggestions for an actively linked patient. Requires CAREGIVER role.",
)
def get_linked_patient_intelligence_suggestions(
    patient_id: uuid.UUID,
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns actionable, non-clinical suggestions for the linked patient.
    """
    return caregiver_service.get_patient_intelligence_suggestions(db, caregiver.id, patient_id)


@router.get(
    "/dashboard/intelligence-overview",
    response_model=List[CaregiverPatientAttentionOverview],
    status_code=status.HTTP_200_OK,
    summary="Get medication attention overview across linked patients",
    description="Returns lightweight adherence and attention indicators across all actively linked patients for the caregiver dashboard. Requires CAREGIVER role.",
)
def get_caregiver_dashboard_intelligence_overview(
    caregiver: CaregiverProfile = Depends(get_current_caregiver),
    db: Session = Depends(get_db),
):
    """
    Returns attention overview for caregiver dashboard.
    """
    return caregiver_service.get_caregiver_patients_intelligence_overview(db, caregiver.id)


