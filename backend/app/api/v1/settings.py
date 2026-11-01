"""Settings API - society profile and configuration backed by DB."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
import json

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_current_active_admin
from app.services.audit_service import AuditService
from app.models.setting import AppSetting

router = APIRouter()

DEFAULT_SETTINGS = {
    "display_name": "NNG and NB Association",
    "society_name": "NNG and NB Association",
    "address": "Nithya Nanda Gokula & Nithya Brindavan, Bengaluru",
    "registration_number": "SOC/2026/001",
    "contact_email": "admin@societytrack.com",
    "contact_phone": "+91 9876543210",
    "default_maintenance_amount": 2750.0,
    "due_date_day": 5,
    "penalty_rate": 0.02,
    "grace_period_days": 5,
    "nng_flats": 12,
    "nb_flats": 13,
    "resident_access_code": "NNGNB2026",
}

class SettingsUpdate(BaseModel):
    display_name: Optional[str] = None
    society_name: Optional[str] = None
    address: Optional[str] = None
    registration_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    default_maintenance_amount: Optional[float] = None
    due_date_day: Optional[int] = None
    penalty_rate: Optional[float] = None
    grace_period_days: Optional[int] = None
    nng_flats: Optional[int] = None
    nb_flats: Optional[int] = None
    resident_access_code: Optional[str] = None

def _get_all_settings_dict(db: Session) -> dict:
    data = DEFAULT_SETTINGS.copy()
    rows = db.query(AppSetting).all()
    for row in rows:
        try:
            data[row.key] = json.loads(row.value)
        except Exception:
            data[row.key] = row.value
    return data

@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Public settings accessible without authentication (for Login page, headers, footers)."""
    data = _get_all_settings_dict(db)
    display = data.get("display_name") or data.get("society_name") or "NNG and NB Association"
    return {
        "display_name": display,
        "society_name": data.get("society_name") or display,
        "address": data.get("address", ""),
        "contact_email": data.get("contact_email", ""),
        "contact_phone": data.get("contact_phone", ""),
    }

@router.get("")
def get_settings(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get current society settings from DB."""
    return _get_all_settings_dict(db)

@router.put("")
def update_settings(
    settings_in: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_admin),
):
    """Update society settings (admin and super-admin only) and persist in DB."""
    old_data = _get_all_settings_dict(db)
    new_data = settings_in.model_dump(exclude_unset=True)

    for key, value in new_data.items():
        if value is not None:
            setting_row = db.query(AppSetting).filter(AppSetting.key == key).first()
            if not setting_row:
                setting_row = AppSetting(key=key, value=json.dumps(value))
                db.add(setting_row)
            else:
                setting_row.value = json.dumps(value)

    db.commit()
    saved = _get_all_settings_dict(db)

    AuditService.log_action(
        db,
        current_user.id,
        current_user.username,
        "UPDATE",
        "Settings",
        "global",
        old_values=old_data,
        new_values=saved,
    )
    return saved
