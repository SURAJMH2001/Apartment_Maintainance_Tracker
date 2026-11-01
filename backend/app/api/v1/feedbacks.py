from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.models.feedback import Feedback
from app.core.dependencies import get_current_user

router = APIRouter()

class FeedbackCreate(BaseModel):
    name: str
    email: Optional[str] = None
    subject: Optional[str] = None
    message: str
    rating: int = 5
    category: str = "service"
    unit: Optional[str] = None

class FeedbackResponse(FeedbackCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

@router.get("", response_model=List[FeedbackResponse])
def get_feedbacks(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()

@router.post("", response_model=FeedbackResponse)
def create_feedback(feedback_in: FeedbackCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    fb = Feedback(
        name=feedback_in.name or current_user.display_name or current_user.username,
        email=feedback_in.email or current_user.email,
        subject=feedback_in.subject,
        message=feedback_in.message,
        rating=feedback_in.rating,
        category=feedback_in.category,
        unit=feedback_in.unit or getattr(current_user, 'unit_number', None)
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb

@router.delete("/{id}")
def delete_feedback(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    fb = db.query(Feedback).filter(Feedback.id == id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    is_admin = current_user.role in ['admin', 'super-admin', 'superadmin', 'manager']
    if not is_admin:
        raise HTTPException(status_code=403, detail="Only society administrators can delete feedback entries")

    db.delete(fb)
    db.commit()
    return {"message": "Feedback deleted"}
