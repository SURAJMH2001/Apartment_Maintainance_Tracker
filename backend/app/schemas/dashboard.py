from pydantic import BaseModel
from typing import List, Dict, Any

class DashboardSummary(BaseModel):
    total_residents: int
    total_pending_dues: float
    monthly_collection_rate: float
    active_alerts: int

class TrendPoint(BaseModel):
    month: str
    income: float
    expense: float

class CategoryBreakdown(BaseModel):
    category: str
    amount: float

class DashboardTrend(BaseModel):
    trends: List[TrendPoint]

class DashboardCategoryBreakdown(BaseModel):
    breakdown: List[CategoryBreakdown]
