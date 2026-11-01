from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Document(BaseModel):
    __tablename__ = "documents"
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False, unique=True)
    file_type = Column(String)
    file_size = Column(Integer)
    upload_date = Column(DateTime)
    parsed = Column(String, default="false") # boolean represented as str, or actual boolean
    parsed_count = Column(Integer, default=0)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    
    transactions = relationship("Transaction", back_populates="document")
