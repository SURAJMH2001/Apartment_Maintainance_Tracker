from sqlalchemy import Column, String, Integer, JSON
from app.models.base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    action = Column(String, nullable=False) # CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=True)
    description = Column(String, nullable=True)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
