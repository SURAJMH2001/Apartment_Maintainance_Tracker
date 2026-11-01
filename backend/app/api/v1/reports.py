"""Reports API - monthly summaries, resident collection, expense breakdowns with year filtering & balance sync."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.transaction import Transaction
from app.models.payment import Payment
from app.models.resident import Resident

router = APIRouter()

@router.get("/years")
def get_available_years(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return distinct years present in transactions and payments."""
    current_year = datetime.now(timezone.utc).year
    years = {current_year}
    
    # Check transactions
    for tx in db.query(Transaction.transaction_date).all():
        if tx[0]:
            try:
                y = int(str(tx[0])[:4])
                years.add(y)
            except Exception:
                pass
                
    # Check payments
    for p in db.query(Payment.month).all():
        if p[0]:
            try:
                y = int(str(p[0])[:4])
                years.add(y)
            except Exception:
                pass
                
    return sorted(list(years), reverse=True)

@router.get("/monthly-summary")
def get_monthly_summary(
    year: Optional[int] = Query(None, description="Filter by year (e.g. 2026)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Monthly income vs expense summary directly synced with Transactions, with net and cumulative balance."""
    all_txs = db.query(Transaction).all()
    all_payments = db.query(Payment).all()
    
    # If year specified, create 12 months for that year and compute running balance
    if year:
        year_str = str(year)
        
        # Calculate opening balance before this year (maintenance + other credit - expenses)
        opening_maint = sum(float(p.paid_amount or 0) for p in all_payments if str(p.month or "")[:4] < year_str)
        opening_other = sum(
            float(t.amount or 0) for t in all_txs
            if t.transaction_date and str(t.transaction_date)[:4] < year_str
            and t.transaction_type == "income"
            and (t.category != "maintenance" and not t.payment_id)
        )
        opening_expense = sum(
            float(t.amount or 0) for t in all_txs
            if t.transaction_date and str(t.transaction_date)[:4] < year_str
            and t.transaction_type == "expense"
        )
        opening_balance = (opening_maint + opening_other) - opening_expense
                    
        running_bal = opening_balance
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        result = []
        
        for m_idx in range(1, 13):
            mo_key = f"{year_str}-{m_idx:02d}"
            mo_label = f"{month_names[m_idx - 1]} {year_str}"
            
            mo_maint = sum(float(p.paid_amount or 0) for p in all_payments if p.month == mo_key)
            mo_other = sum(
                float(t.amount or 0) for t in all_txs 
                if t.transaction_type == "income" 
                and (t.category != "maintenance" and not t.payment_id)
                and str(t.transaction_date)[:7] == mo_key
            )
            mo_income = mo_maint + mo_other
            mo_expense = sum(float(t.amount or 0) for t in all_txs if t.transaction_type == "expense" and str(t.transaction_date)[:7] == mo_key)
            net = mo_income - mo_expense
            running_bal += net
            
            result.append({
                "month": mo_key,
                "month_label": mo_label,
                "income": round(mo_income, 2),
                "total_income": round(mo_income, 2),
                "expense": round(mo_expense, 2),
                "total_expense": round(mo_expense, 2),
                "net": round(net, 2),
                "net_balance": round(net, 2),
                "cumulative_balance": round(running_bal, 2)
            })
        return result

    # If no year specified, compute for all distinct months
    months_set = set()
    for t in all_txs:
        if t.transaction_date:
            months_set.add(str(t.transaction_date)[:7])
    for p in all_payments:
        if p.month:
            months_set.add(str(p.month)[:7])
            
    if not months_set:
        now_mo = datetime.now(timezone.utc).strftime("%Y-%m")
        months_set.add(now_mo)
        
    sorted_months = sorted(list(months_set))
    running_bal = 0.0
    result = []
    
    for mo in sorted_months:
        mo_maint = sum(float(p.paid_amount or 0) for p in all_payments if p.month == mo)
        mo_other = sum(
            float(t.amount or 0) for t in all_txs 
            if t.transaction_type == "income" 
            and (t.category != "maintenance" and not t.payment_id)
            and str(t.transaction_date)[:7] == mo
        )
        mo_income = mo_maint + mo_other
        mo_expense = sum(float(t.amount or 0) for t in all_txs if t.transaction_type == "expense" and str(t.transaction_date)[:7] == mo)
        net = mo_income - mo_expense
        running_bal += net
        
        result.append({
            "month": mo,
            "month_label": mo,
            "income": round(mo_income, 2),
            "total_income": round(mo_income, 2),
            "expense": round(mo_expense, 2),
            "total_expense": round(mo_expense, 2),
            "net": round(net, 2),
            "net_balance": round(net, 2),
            "cumulative_balance": round(running_bal, 2)
        })
    return result

@router.get("/resident-collection")
def get_resident_collection(
    year: Optional[int] = Query(None, description="Filter by year (e.g. 2026)"),
    month: Optional[str] = Query(None, description="Filter by month YYYY-MM"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Per-resident payment collection status synced for selected year or month."""
    query = db.query(Payment)
    if year:
        query = query.filter(Payment.month.like(f"{year}-%"))
    elif month:
        query = query.filter(Payment.month == month)

    payments = query.all()
    residents = db.query(Resident).all()
    res_map = {r.id: r for r in residents}
    
    grouped = {}
    for p in payments:
        if p.resident_id not in grouped:
            grouped[p.resident_id] = {"due": 0.0, "paid": 0.0, "count": 0}
        grouped[p.resident_id]["due"] += float(p.due_amount or 0)
        grouped[p.resident_id]["paid"] += float(p.paid_amount or 0)
        grouped[p.resident_id]["count"] += 1
        
    result = []
    for res_id, r in res_map.items():
        stats = grouped.get(res_id, {"due": 0.0, "paid": 0.0, "count": 0})
        total_due = round(stats["due"], 2)
        total_paid = round(stats["paid"], 2)
        balance = round(total_due - total_paid, 2)
        rate = round((total_paid / total_due * 100) if total_due > 0 else 100.0, 1)
        
        result.append({
            "id": res_id,
            "resident_id": res_id,
            "unit": r.unit_number,
            "unit_number": r.unit_number,
            "name": r.owner_name,
            "owner_name": r.owner_name,
            "owner_phone": r.owner_phone or "",
            "phone": r.owner_phone or "",
            "totalDue": total_due,
            "total_due": total_due,
            "totalPaid": total_paid,
            "total_paid": total_paid,
            "balance": balance,
            "outstanding_balance": balance,
            "collection_rate": rate,
            "bills_count": stats["count"]
        })
        
    return sorted(result, key=lambda x: x["balance"], reverse=True)

@router.get("/expense-breakdown")
def get_expense_breakdown(
    year: Optional[int] = Query(None, description="Filter by year (e.g. 2026)"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Expense totals by category with percentage breakdown synced with Transactions."""
    query = db.query(Transaction).filter(Transaction.transaction_type == "expense")
    
    if year:
        query = query.filter(func.strftime("%Y", Transaction.transaction_date) == str(year))
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    expenses = query.all()
    cats = {}
    for exp in expenses:
        cat = (exp.category or "Other").capitalize()
        cats[cat] = cats.get(cat, 0.0) + float(exp.amount or 0)
        
    total = sum(cats.values()) or 1.0
    
    return [
        {
            "name": k,
            "category": k,
            "value": round(v, 2),
            "amount": round(v, 2),
            "percentage": round(v / total * 100, 1),
        }
        for k, v in sorted(cats.items(), key=lambda x: x[1], reverse=True)
    ]
