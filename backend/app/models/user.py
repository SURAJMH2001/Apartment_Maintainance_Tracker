from sqlalchemy import Column, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class User(BaseModel):
    __tablename__ = "users"
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="viewer")  # admin, manager, viewer
    is_active = Column(Boolean, default=True)
    display_name = Column(String, nullable=True)   # Full name from Google
    avatar_url = Column(String, nullable=True)     # Profile picture URL
    phone = Column(String, nullable=True)          # Contact number
    dob = Column(String, nullable=True)            # Age / Date of Birth
    
    # Link to a specific flat
    resident_id = Column(String, ForeignKey('residents.id'), nullable=True)
    is_approved = Column(Boolean, default=False)
    
    resident = relationship("Resident", back_populates="users")
