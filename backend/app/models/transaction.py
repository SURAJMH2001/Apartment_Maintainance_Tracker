from sqlalchemy import Column, Float, String, Date, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.models.base import BaseModel

class Transaction(BaseModel):
    __tablename__ = "transactions"
    transaction_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    transaction_type = Column(String, nullable=False) # income, expense
    category = Column(String, nullable=False) # maintenance, utility, repair, salary, other
    description = Column(String)
    reference_number = Column(String)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    
    resident = relationship("Resident", back_populates="transactions")
    document = relationship("Document", back_populates="transactions")
    payment = relationship("Payment", back_populates="transactions")
