from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models.announcement import Announcement
from app.core.dependencies import get_current_user, get_current_manager_or_admin

router = APIRouter()

class AnnouncementBase(BaseModel):
    title: str
    content: str
    priority: str = "normal"
    created_by: Optional[str] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementResponse(AnnouncementBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

@router.get("", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).all()

@router.post("", response_model=AnnouncementResponse)
def create_announcement(ann: AnnouncementCreate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    ann.created_by = current_user.display_name or current_user.username
    db_ann = Announcement(**ann.model_dump())
    db.add(db_ann)
    db.commit()
    db.refresh(db_ann)
    return db_ann

@router.delete("/{id}")
def delete_announcement(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    db_ann = db.query(Announcement).filter(Announcement.id == id).first()
    if not db_ann:
        raise HTTPException(status_code=404, detail="Announcement not found")
    db.delete(db_ann)
    db.commit()
    return {"message": "Announcement deleted"}
