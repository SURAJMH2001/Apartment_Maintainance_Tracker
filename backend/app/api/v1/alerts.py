from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.models.alert import Alert
from app.models.resident import Resident
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class AlertResponseCustom(BaseModel):
    id: int
    alert_type: str
    severity: str
    title: str
    message: str
    resident_id: Optional[int] = None
    resident: Optional[str] = None
    unit: Optional[str] = None
    is_resolved: bool
    status: str
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("", response_model=List[AlertResponseCustom])
def get_alerts(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Alert)
    if current_user.role == "viewer" and current_user.resident_id:
        try:
            query = query.filter((Alert.resident_id == int(current_user.resident_id)) | (Alert.resident_id == None))
        except ValueError:
            pass

    alerts = query.order_by(Alert.created_at.desc()).all()
    results = []
    for a in alerts:
        res_name = "-"
        unit_str = ""
        if a.resident_id:
            r = db.query(Resident).filter(Resident.id == a.resident_id).first()
            if r:
                res_name = r.owner_name
                unit_str = r.unit_number

        results.append(AlertResponseCustom(
            id=a.id,
            alert_type=a.alert_type,
            severity=a.severity,
            title=a.title,
            message=a.message,
            resident_id=a.resident_id,
            resident=res_name,
            unit=unit_str,
            is_resolved=a.is_resolved,
            status="resolved" if a.is_resolved else "active",
            resolved_at=a.resolved_at,
            resolved_by=a.resolved_by,
            created_at=a.created_at
        ))
    return results

@router.put("/{id}/resolve", response_model=AlertResponseCustom)
def resolve_alert(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    alert.resolved_by = current_user.id
    db.commit()
    db.refresh(alert)

    res_name = "-"
    unit_str = ""
    if alert.resident_id:
        r = db.query(Resident).filter(Resident.id == alert.resident_id).first()
        if r:
            res_name = r.owner_name
            unit_str = r.unit_number

    return AlertResponseCustom(
        id=alert.id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        title=alert.title,
        message=alert.message,
        resident_id=alert.resident_id,
        resident=res_name,
        unit=unit_str,
        is_resolved=alert.is_resolved,
        status="resolved",
        resolved_at=alert.resolved_at,
        resolved_by=alert.resolved_by,
        created_at=alert.created_at
    )
