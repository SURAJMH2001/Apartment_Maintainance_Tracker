from sqlalchemy import Column, Float, String, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Payment(BaseModel):
    __tablename__ = "payments"
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    month = Column(String, nullable=False) # YYYY-MM
    due_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    due_date = Column(Date, nullable=False)
    paid_date = Column(Date, nullable=True)
    status = Column(String, default="pending") # pending, partial, paid, overdue
    penalty_amount = Column(Float, default=0.0)
    payment_method = Column(String)
    notes = Column(String)
    
    resident = relationship("Resident", back_populates="payments")
    transactions = relationship("Transaction", back_populates="payment")
