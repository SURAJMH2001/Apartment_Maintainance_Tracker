from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class PaymentBase(BaseModel):
    resident_id: int
    month: str
    due_amount: float
    paid_amount: float = 0.0
    due_date: date
    paid_date: Optional[date] = None
    status: str = "pending"
    penalty_amount: float = 0.0
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    resident_id: Optional[int] = None
    due_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    paid_date: Optional[date] = None
    status: Optional[str] = None
    penalty_amount: Optional[float] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    already_billed: Optional[bool] = False
    skip_transaction: Optional[bool] = False

class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
