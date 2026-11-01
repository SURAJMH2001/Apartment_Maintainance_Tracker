from pydantic import BaseModel, model_validator
from typing import Optional, Any
from datetime import date, datetime

class TransactionBase(BaseModel):
    transaction_date: Optional[date] = None
    amount: float
    transaction_type: Optional[str] = None
    category: str
    description: Optional[str] = None
    reference_number: Optional[str] = None
    resident_id: Optional[int] = None
    document_id: Optional[int] = None
    payment_id: Optional[int] = None

    @model_validator(mode="before")
    @classmethod
    def check_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map 'date' -> 'transaction_date' if not already supplied
            if "transaction_date" not in data or data["transaction_date"] is None:
                if "date" in data and data["date"]:
                    data["transaction_date"] = data["date"]
            # Map 'type' -> 'transaction_type' if not already supplied
            if "transaction_type" not in data or data["transaction_type"] is None:
                if "type" in data and data["type"]:
                    data["transaction_type"] = data["type"]
            tt = str(data.get("transaction_type") or "").lower()
            if tt == "credit":
                data["transaction_type"] = "income"
            elif tt == "debit":
                data["transaction_type"] = "expense"
        return data

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(TransactionBase):
    transaction_date: Optional[date] = None
    amount: Optional[float] = None
    transaction_type: Optional[str] = None
    category: Optional[str] = None

class TransactionResponse(TransactionBase):
    id: int
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
