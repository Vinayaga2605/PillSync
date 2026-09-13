"""
Caregiver domain models.

Re-exports CaregiverProfile and CaregiverPatientAssignment from app.models.user
with CaregiverPatientLink alias for domain and specification consistency.
"""

from app.models.user import (
    CaregiverProfile,
    CaregiverPatientAssignment,
)

# Alias for canonical relationship naming
CaregiverPatientLink = CaregiverPatientAssignment

__all__ = [
    "CaregiverProfile",
    "CaregiverPatientAssignment",
    "CaregiverPatientLink",
]
