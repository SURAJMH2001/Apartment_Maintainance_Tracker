"""Dashboard API - aggregation endpoints for KPIs, trends, and breakdowns."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import List

from app.core.database import get_db
from app.models.resident import Resident
from app.models.payment import Payment
from app.models.alert import Alert
from app.models.transaction import Transaction
from app.models.task import Task
from app.models.announcement import Announcement
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return high-level KPI statistics, including tasks count and viewer-specific data."""
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    # If viewer, return viewer-specific summary
    if current_user.role == "viewer":
        res_id = None
        if current_user.resident_id:
            try:
                res_id = int(current_user.resident_id)
            except ValueError:
                pass
        
        pending_dues = 0.0
        pending_payments_count = 0
        current_month_due = 0.0
        unit_str = ""

        if res_id:
            res = db.query(Resident).filter(Resident.id == res_id).first()
            if res:
                unit_str = res.unit_number
            
            user_payments = db.query(Payment).filter(
                Payment.resident_id == res_id,
                Payment.status.in_(["pending", "partial", "overdue"])
            ).all()
            pending_dues = sum(p.due_amount - p.paid_amount for p in user_payments)
            pending_payments_count = len(user_payments)

            curr_m_p = db.query(Payment).filter(
                Payment.resident_id == res_id,
                Payment.month == current_month
            ).first()
            if curr_m_p and curr_m_p.status != "paid":
                current_month_due = curr_m_p.due_amount - curr_m_p.paid_amount

        user_tasks = []
        if current_user.resident_id:
            user_tasks = db.query(Task).filter(
                Task.resident_id == current_user.resident_id,
                Task.status != "completed"
            ).all()

        return {
            "is_viewer": True,
            "unit": unit_str,
            "pending_dues": round(pending_dues, 2),
            "pending_payments_count": pending_payments_count,
            "current_month_due": round(current_month_due, 2),
            "pending_tasks_count": len(user_tasks) + pending_payments_count,
            "current_month": current_month
        }

    # Admin / Super-admin summary
    total_residents = db.query(Resident).filter(Resident.is_active == True).count()

    total_pending_dues = (
        db.query(func.sum(Payment.due_amount - Payment.paid_amount))
        .filter(Payment.status.in_(["pending", "partial", "overdue"]))
        .scalar()
        or 0.0
    )

    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()

    # Collection rate for current month
    month_payments = db.query(Payment).filter(Payment.month == current_month).all()
    total_due_month = sum(p.due_amount for p in month_payments) or 1
    total_paid_month = sum(p.paid_amount for p in month_payments)
    collection_rate = round((total_paid_month / total_due_month) * 100, 1) if month_payments else 0.0

    # Transactions for current month: Align with payments page (maintenance collected + other non-maintenance credits)
    txs = db.query(Transaction).all()
    other_income = sum(
        float(t.amount or 0) for t in txs 
        if t.transaction_type == "income" 
        and (t.category != "maintenance" and not t.payment_id)
        and str(t.transaction_date)[:7] == current_month
    )
    month_income = total_paid_month + other_income
    month_expense = sum(
        float(t.amount or 0) for t in txs 
        if t.transaction_type == "expense" 
        and str(t.transaction_date)[:7] == current_month
    )

    # Task counters
    pending_tasks = db.query(Task).filter(Task.status == "pending").count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    overdue_tasks = db.query(Task).filter(Task.status == "overdue").count()
    total_tasks = pending_tasks + completed_tasks + overdue_tasks

    return {
        "is_viewer": False,
        "total_residents": total_residents,
        "total_pending_dues": round(total_pending_dues, 2),
        "monthly_collection_rate": collection_rate,
        "active_alerts": active_alerts,
        "monthly_income": round(month_income, 2),
        "monthly_expense": round(month_expense, 2),
        "current_month": current_month,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "overdue_tasks": overdue_tasks,
        "total_tasks": total_tasks,
        # CamelCase aliases for frontend
        "pendingTasks": pending_tasks,
        "completedTasks": completed_tasks,
        "overdueTasks": overdue_tasks,
        "totalTasks": total_tasks,
    }

@router.get("/monthly-trend")
def get_monthly_trend(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return income vs expense trend for the last N months, ensuring continuous month points."""
    now = datetime.now(timezone.utc)
    
    # Generate list of past N months in YYYY-MM
    months_list = []
    y = now.year
    m = now.month
    for _ in range(months):
        months_list.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    months_list.reverse()
    
    pivot = {mo: {"month": mo, "income": 0.0, "expense": 0.0} for mo in months_list}
    all_payments = db.query(Payment).all()
    txs = db.query(Transaction).all()
    
    for mo in months_list:
        maint_paid = sum(float(p.paid_amount or 0) for p in all_payments if p.month == mo)
        other_inc = sum(
            float(t.amount or 0) for t in txs
            if t.transaction_type == "income"
            and (t.category != "maintenance" and not t.payment_id)
            and str(t.transaction_date)[:7] == mo
        )
        exp = sum(
            float(t.amount or 0) for t in txs
            if t.transaction_type == "expense"
            and str(t.transaction_date)[:7] == mo
        )
        pivot[mo]["income"] = round(maint_paid + other_inc, 2)
        pivot[mo]["expense"] = round(exp, 2)
                
    for mo in pivot:
        pivot[mo]["income"] = round(pivot[mo]["income"], 2)
        pivot[mo]["expense"] = round(pivot[mo]["expense"], 2)

    return {"trends": [pivot[mo] for mo in months_list]}

@router.get("/category-breakdown")
def get_category_breakdown(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return expense totals by category synced with transactions."""
    expenses = db.query(Transaction).filter(Transaction.transaction_type == "expense").all()
    cats = {}
    for exp in expenses:
        cat = (exp.category or "Other").capitalize()
        cats[cat] = cats.get(cat, 0.0) + float(exp.amount or 0)
    
    return {
        "breakdown": [
            {"category": k, "amount": round(v, 2)}
            for k, v in cats.items()
        ]
    }

@router.get("/top-defaulters")
def get_top_defaulters(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return residents with most overdue months."""
    overdue_payments = (
        db.query(
            Payment.resident_id,
            func.count(Payment.id).label("overdue_count"),
            func.sum(Payment.due_amount - Payment.paid_amount).label("total_outstanding"),
        )
        .filter(Payment.status == "overdue")
        .group_by(Payment.resident_id)
        .order_by(func.count(Payment.id).desc())
        .limit(limit)
        .all()
    )

    result = []
    for op in overdue_payments:
        resident = db.query(Resident).filter(Resident.id == op.resident_id).first()
        if resident:
            result.append(
                {
                    "resident_id": op.resident_id,
                    "unit_number": resident.unit_number,
                    "owner_name": resident.owner_name,
                    "owner_phone": resident.owner_phone,
                    "overdue_count": op.overdue_count,
                    "total_outstanding": round(op.total_outstanding or 0.0, 2),
                }
            )
    return result

@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return most recent transactions for the dashboard."""
    query = db.query(Transaction)
    if current_user.role == "viewer" and current_user.resident_id:
        try:
            query = query.filter(Transaction.resident_id == int(current_user.resident_id))
        except ValueError:
            pass

    transactions = (
        query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for t in transactions:
        resident_name = None
        unit_number = None
        if t.resident_id:
            r = db.query(Resident).filter(Resident.id == t.resident_id).first()
            if r:
                resident_name = r.owner_name
                unit_number = r.unit_number
        result.append(
            {
                "id": t.id,
                "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
                "amount": t.amount,
                "transaction_type": t.transaction_type,
                "category": t.category,
                "description": t.description,
                "resident_name": resident_name,
                "unit_number": unit_number,
            }
        )
    return result
