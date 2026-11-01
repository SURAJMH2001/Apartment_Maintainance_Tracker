from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey
from app.models.base import BaseModel

class Alert(BaseModel):
    __tablename__ = "alerts"
    alert_type = Column(String, nullable=False) # overdue_payment, document_parsed, system
    severity = Column(String, default="info") # info, warning, critical
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
