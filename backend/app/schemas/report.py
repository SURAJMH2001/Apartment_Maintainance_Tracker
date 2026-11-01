from pydantic import BaseModel
from typing import List

class MonthlySummary(BaseModel):
    month: str
    total_income: float
    total_expense: float
    net_balance: float

class ResidentCollection(BaseModel):
    resident_id: int
    unit_number: str
    owner_name: str
    total_due: float
    total_paid: float
    outstanding_balance: float

class ExpenseBreakdown(BaseModel):
    category: str
    amount: float
    percentage: float
