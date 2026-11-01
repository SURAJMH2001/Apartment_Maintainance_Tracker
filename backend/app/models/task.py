from sqlalchemy import Column, String, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Task(BaseModel):
    __tablename__ = "tasks"
    title = Column(String, nullable=False)
    description = Column(String)
    category = Column(String, default="Maintenance")
    location = Column(String, nullable=True)
    assignee = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, in_progress, completed, overdue
    priority = Column(String, default="medium") # low, medium, high, critical
    due_date = Column(Date)
    
    # Optional link to a resident or unit (e.g. plumbing issue in GF1)
    resident_id = Column(String, ForeignKey('residents.id'), nullable=True)
    resident = relationship("Resident")

    # Link to reported issue if auto-synced
    issue_id = Column(Integer, ForeignKey('issues.id', ondelete="SET NULL"), nullable=True)
    issue = relationship("Issue", foreign_keys=[issue_id])
