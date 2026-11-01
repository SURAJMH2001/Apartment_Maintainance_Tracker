from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse
from app.core.dependencies import get_current_active_admin

router = APIRouter()

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

@router.delete("/logs/cleanup")
def cleanup_audit_logs(db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    deleted_count = db.query(AuditLog).delete()
    db.commit()
    return {"message": f"Successfully cleared {deleted_count} audit logs"}
