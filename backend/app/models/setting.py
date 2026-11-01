from sqlalchemy import Column, String, Float, Integer
from app.models.base import BaseModel

class AppSetting(BaseModel):
    __tablename__ = "settings"
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=False)
