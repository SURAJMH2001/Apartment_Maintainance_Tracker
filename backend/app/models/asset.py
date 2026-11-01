from sqlalchemy import Column, String, Date, Float
from app.models.base import BaseModel

class Asset(BaseModel):
    __tablename__ = "assets"
    name = Column(String, nullable=False)
    category = Column(String) # e.g., Lift, Generator, Pump
    location = Column(String, nullable=True) # e.g. Rooftop, Basement
    purchase_date = Column(Date)
    purchase_cost = Column(Float)
    status = Column(String, default="active") # active, under_maintenance, retired
    last_maintenance_date = Column(Date)
    next_maintenance_date = Column(Date)
