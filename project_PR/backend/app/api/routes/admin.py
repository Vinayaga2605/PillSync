import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import User
from app.schemas.user import UserRole
from app.schemas.admin import (
    AdminDashboardSummaryResponse,
    AdminUserListResponse,
    AdminUserDetailResponse,
    AdminPatientListResponse,
    AdminPatientDetailResponse,
    AdminCaregiverListResponse,
    AdminCaregiverDetailResponse,
    AdminRelationshipListResponse,
    AdminAnalyticsSummaryResponse,
)
from app.services import admin_service

router = APIRouter(
    prefix="/admin",
    tags=["Admin Workspace"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


@router.get(
    "/analytics/summary",
    response_model=AdminAnalyticsSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get comprehensive system analytics and monitoring metrics",
    description="Calculates system-wide usage metrics, adherence trends, dose performance, user growth, notification activity, and health status. Requires ADMIN role.",
)
def get_analytics_summary(
    days: int = Query(30, ge=1, le=90, description="Timeframe in days for daily adherence trends"),
    db: Session = Depends(get_db),
):
    return admin_service.get_admin_analytics_summary(db, days=days)


@router.get(
    "/dashboard/summary",
    response_model=AdminDashboardSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get system-level admin dashboard summary",
    description="Calculates system-wide aggregate metrics across users, patients, caregivers, medications, schedules, dose events, and relationships. Requires ADMIN role.",
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
):
    return admin_service.get_admin_dashboard_summary(db)


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List system users",
    description="Returns paginated safe user accounts with optional role, status, and search filters. Requires ADMIN role.",
)
def list_users(
    role: Optional[str] = Query(None, description="Filter by user role (PATIENT, CAREGIVER, ADMIN)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search term for email or name"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db),
):
    items, total_count = admin_service.get_admin_users(
        db, role=role, is_active=is_active, search=search, limit=limit, offset=offset
    )
    return AdminUserListResponse(total_count=total_count, items=items)


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user details",
    description="Returns safe detailed user view including associated profile references. Requires ADMIN role.",
)
def get_user_detail(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return admin_service.get_admin_user_by_id(db, user_id)


@router.get(
    "/patients",
    response_model=AdminPatientListResponse,
    status_code=status.HTTP_200_OK,
    summary="List patient profiles",
    description="Returns paginated safe patient profiles with linked caregiver counts and medication statistics. Requires ADMIN role.",
)
def list_patients(
    search: Optional[str] = Query(None, description="Search term for patient name, email, or phone"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db),
):
    items, total_count = admin_service.get_admin_patients(
        db, search=search, limit=limit, offset=offset
    )
    return AdminPatientListResponse(total_count=total_count, items=items)


@router.get(
    "/patients/{patient_id}",
    response_model=AdminPatientDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get patient profile details",
    description="Returns detailed safe patient profile for administrators. Requires ADMIN role.",
)
def get_patient_detail(
    patient_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return admin_service.get_admin_patient_by_id(db, patient_id)


@router.get(
    "/caregivers",
    response_model=AdminCaregiverListResponse,
    status_code=status.HTTP_200_OK,
    summary="List caregiver profiles",
    description="Returns paginated safe caregiver profiles with linked patient counts. Requires ADMIN role.",
)
def list_caregivers(
    search: Optional[str] = Query(None, description="Search term for caregiver name, email, or organization"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db),
):
    items, total_count = admin_service.get_admin_caregivers(
        db, search=search, limit=limit, offset=offset
    )
    return AdminCaregiverListResponse(total_count=total_count, items=items)


@router.get(
    "/caregivers/{caregiver_id}",
    response_model=AdminCaregiverDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get caregiver profile details",
    description="Returns detailed safe caregiver profile for administrators. Requires ADMIN role.",
)
def get_caregiver_detail(
    caregiver_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    return admin_service.get_admin_caregiver_by_id(db, caregiver_id)


@router.get(
    "/relationships",
    response_model=AdminRelationshipListResponse,
    status_code=status.HTTP_200_OK,
    summary="List caregiver-patient relationships",
    description="Returns paginated caregiver-patient assignments with optional filtering by caregiver or patient. Requires ADMIN role.",
)
def list_relationships(
    caregiver_id: Optional[uuid.UUID] = Query(None, description="Filter by caregiver profile ID"),
    patient_id: Optional[uuid.UUID] = Query(None, description="Filter by patient profile ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=100, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    db: Session = Depends(get_db),
):
    items, total_count = admin_service.get_admin_relationships(
        db, caregiver_id=caregiver_id, patient_id=patient_id, is_active=is_active, limit=limit, offset=offset
    )
    return AdminRelationshipListResponse(total_count=total_count, items=items)
