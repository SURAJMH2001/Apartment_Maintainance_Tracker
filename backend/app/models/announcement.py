from sqlalchemy import Column, String
from app.models.base import BaseModel

class Announcement(BaseModel):
    __tablename__ = "announcements"
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    priority = Column(String, default="normal") # normal, high
    created_by = Column(String) # Could be username or admin name
