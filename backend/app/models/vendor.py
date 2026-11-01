from sqlalchemy import Column, String, Boolean
from app.models.base import BaseModel

class Vendor(BaseModel):
    __tablename__ = "vendors"
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    contact = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    service = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
