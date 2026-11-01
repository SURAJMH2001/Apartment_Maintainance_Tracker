from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Vehicle(BaseModel):
    __tablename__ = "vehicles"
    resident_id = Column(String, ForeignKey('residents.id'), nullable=False)
    vehicle_type = Column(String, nullable=False) # e.g., "2W", "4W"
    registration_number = Column(String, nullable=False)
    make_model = Column(String) # e.g., "Honda City", "Royal Enfield"
    parking_slot = Column(String, nullable=True)
    
    resident = relationship("Resident", back_populates="vehicles")
