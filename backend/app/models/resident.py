from sqlalchemy import Column, String, Boolean, Date, Integer, Float
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Resident(BaseModel):
    __tablename__ = "residents"
    
    # NNG or NB
    block = Column(String, nullable=False, default="NNG")
    # GF1, FF1, PH1 etc
    flat_number = Column(String, nullable=False)
    
    # Unit number combination e.g., "NNG-GF1" (multiple residents/family members can belong to same flat)
    unit_number = Column(String, unique=False, index=True, nullable=False)
    
    floor = Column(Integer)
    owner_name = Column(String, nullable=False)
    owner_email = Column(String)
    owner_phone = Column(String)
    alternate_phone = Column(String)
    ownership_type = Column(String, default="owner") # owner, tenant, builder, family_member
    move_in_date = Column(Date)
    is_active = Column(Boolean, default=True)
    notes = Column(String)
    
    
    payments = relationship("Payment", back_populates="resident", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="resident")
    users = relationship("User", back_populates="resident")
    vehicles = relationship("Vehicle", back_populates="resident", cascade="all, delete-orphan")
