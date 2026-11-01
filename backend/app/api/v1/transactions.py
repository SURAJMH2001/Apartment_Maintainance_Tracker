from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timezone
import re
from pydantic import BaseModel

from sqlalchemy import func
from app.core.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.repositories.transaction_repository import transaction_repo
from app.models.transaction import Transaction
from app.models.payment import Payment
from app.models.resident import Resident
from app.core.dependencies import get_current_user, get_current_manager_or_admin, get_current_active_admin
from app.services.audit_service import AuditService

router = APIRouter()

class TransactionDetailedResponse(TransactionResponse):
    resident: Optional[str] = None
    unit_number: Optional[str] = None
    payment_id: Optional[int] = None

@router.get("/summary")
def get_transactions_summary(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all-time total income, total expenses, and net passbook balance."""
    total_income = db.query(func.sum(Transaction.amount)).filter(Transaction.transaction_type == "income").scalar() or 0.0
    total_expense = db.query(func.sum(Transaction.amount)).filter(Transaction.transaction_type == "expense").scalar() or 0.0
    total_txs = db.query(Transaction).count()
    return {
        "total_income": round(float(total_income), 2),
        "total_expense": round(float(total_expense), 2),
        "available_balance": round(float(total_income - total_expense), 2),
        "total_transactions": total_txs
    }

@router.get("", response_model=List[TransactionDetailedResponse])
def get_transactions(
    type: Optional[str] = Query(None, description="income, expense, or all"),
    category: Optional[str] = None,
    resident_id: Optional[int] = None,
    month: Optional[str] = Query(None, description="Filter by YYYY-MM"),
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Transaction)
    
    # Filter by specific resident_id if explicitly queried
    if resident_id:
        query = query.filter(Transaction.resident_id == resident_id)

    if month:
        try:
            import calendar
            from sqlalchemy import or_
            y, m = [int(p) for p in month.split("-")]
            last_day = calendar.monthrange(y, m)[1]
            start_d = date(y, m, 1)
            end_d = date(y, m, last_day)
            query = query.outerjoin(Payment, Transaction.payment_id == Payment.id).filter(
                or_(
                    (Transaction.transaction_date >= start_d) & (Transaction.transaction_date <= end_d),
                    Payment.month == month,
                    Transaction.description.like(f"%{month}%")
                )
            )
        except Exception:
            pass

    if type and type != "all":
        t_type = type.lower()
        if t_type == "credit":
            t_type = "income"
        elif t_type == "debit":
            t_type = "expense"
        query = query.filter(Transaction.transaction_type == t_type)
    if category and category != "all":
        query = query.filter(Transaction.category == category)

    txs = query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for t in txs:
        res_name = None
        unit_str = None
        if t.resident_id:
            r = db.query(Resident).filter(Resident.id == t.resident_id).first()
            if r:
                res_name = r.owner_name
                unit_str = r.unit_number
        results.append(TransactionDetailedResponse(
            id=t.id,
            transaction_date=t.transaction_date,
            amount=t.amount,
            transaction_type=t.transaction_type,
            category=t.category,
            description=t.description,
            reference_number=t.reference_number,
            resident_id=t.resident_id,
            document_id=t.document_id,
            payment_id=t.payment_id,
            created_by=t.created_by,
            created_at=t.created_at,
            updated_at=t.updated_at,
            resident=res_name,
            unit_number=unit_str
        ))
    return results

@router.post("", response_model=TransactionDetailedResponse)
def create_transaction(
    transaction_in: TransactionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    data = transaction_in.model_dump()
    data["created_by"] = current_user.id
    
    # If resident_id is not specified in request, default to currently logged-in user's resident_id
    if not data.get("resident_id") and current_user.resident_id:
        try:
            data["resident_id"] = int(current_user.resident_id)
        except ValueError:
            pass

    transaction = transaction_repo.create(db, data)
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Transaction", transaction.id, new_values=data)

    res_name = None
    unit_str = None
    if transaction.resident_id:
        r = db.query(Resident).filter(Resident.id == transaction.resident_id).first()
        if r:
            res_name = r.owner_name
            unit_str = r.unit_number

    return TransactionDetailedResponse(
        id=transaction.id,
        transaction_date=transaction.transaction_date,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        category=transaction.category,
        description=transaction.description,
        reference_number=transaction.reference_number,
        resident_id=transaction.resident_id,
        document_id=transaction.document_id,
        payment_id=transaction.payment_id,
        created_by=transaction.created_by,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        resident=res_name,
        unit_number=unit_str
    )

@router.get("/{id}", response_model=TransactionDetailedResponse)
def get_transaction(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    res_name = None
    unit_str = None
    if transaction.resident_id:
        r = db.query(Resident).filter(Resident.id == transaction.resident_id).first()
        if r:
            res_name = r.owner_name
            unit_str = r.unit_number
    return TransactionDetailedResponse(
        id=transaction.id,
        transaction_date=transaction.transaction_date,
        amount=transaction.amount,
        transaction_type=transaction.transaction_type,
        category=transaction.category,
        description=transaction.description,
        reference_number=transaction.reference_number,
        resident_id=transaction.resident_id,
        document_id=transaction.document_id,
        payment_id=transaction.payment_id,
        created_by=transaction.created_by,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        resident=res_name,
        unit_number=unit_str
    )

@router.put("/{id}", response_model=TransactionDetailedResponse)
def update_transaction(id: int, transaction_in: TransactionUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    updated = transaction_repo.update(db, transaction, transaction_in.model_dump(exclude_unset=True))
    
    # If transaction is linked to a payment, sync payment's paid_amount and status
    if updated.payment_id:
        p = db.query(Payment).filter(Payment.id == updated.payment_id).first()
        if p:
            if "amount" in transaction_in.model_dump(exclude_unset=True):
                p.paid_amount = updated.amount
                if p.paid_amount >= p.due_amount:
                    p.status = "paid"
                elif p.paid_amount > 0:
                    p.status = "partial"
                else:
                    p.status = "pending"
            if updated.transaction_date:
                p.paid_date = updated.transaction_date
            db.commit()

    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Transaction", transaction.id)
    res_name = None
    unit_str = None
    if updated.resident_id:
        r = db.query(Resident).filter(Resident.id == updated.resident_id).first()
        if r:
            res_name = r.owner_name
            unit_str = r.unit_number
    return TransactionDetailedResponse(
        id=updated.id,
        transaction_date=updated.transaction_date,
        amount=updated.amount,
        transaction_type=updated.transaction_type,
        category=updated.category,
        description=updated.description,
        reference_number=updated.reference_number,
        resident_id=updated.resident_id,
        document_id=updated.document_id,
        payment_id=updated.payment_id,
        created_by=updated.created_by,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        resident=res_name,
        unit_number=unit_str
    )

@router.delete("/{id}")
def delete_transaction(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    transaction = transaction_repo.get(db, id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # 1. Revert payment status if this transaction is linked to a payment
    payment_id = transaction.payment_id
    if not payment_id and transaction.resident_id and transaction.transaction_type == "income" and transaction.category == "maintenance":
        # Match payment by resident_id and month in description (e.g. "Maintenance 2026-03 - ...")
        desc = transaction.description or ""
        match = re.search(r"Maintenance\s+(\d{4}-\d{2})", desc)
        if match:
            month_str = match.group(1)
            p = db.query(Payment).filter(Payment.resident_id == transaction.resident_id, Payment.month == month_str).first()
            if p:
                payment_id = p.id

    if payment_id:
        payment = db.query(Payment).filter(Payment.id == payment_id).first()
        if payment:
            # Calculate remaining transactions for this payment (excluding the one being deleted)
            other_txs = db.query(Transaction).filter(
                Transaction.payment_id == payment.id,
                Transaction.id != transaction.id
            ).all()
            remaining_paid = sum(t.amount for t in other_txs)

            if not other_txs:
                # If transactions were created without explicit payment_id initially
                remaining_paid = max(0.0, float(payment.paid_amount or 0.0) - float(transaction.amount))

            payment.paid_amount = round(remaining_paid, 2)
            today = datetime.now(timezone.utc).date()
            if payment.paid_amount <= 0:
                payment.paid_amount = 0.0
                payment.paid_date = None
                payment.payment_method = None
                payment.status = "overdue" if payment.due_date and payment.due_date < today else "pending"
            elif payment.paid_amount < payment.due_amount:
                payment.status = "partial"
            else:
                payment.status = "paid"
            db.commit()

    transaction_repo.delete(db, id)
    AuditService.log_action(db, current_user.id, current_user.username, "DELETE", "Transaction", id)
    return {"message": "Transaction deleted successfully and linked financial records reverted"}

@router.post("/cleanup-financial-data")
def cleanup_financial_data(db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    """Admin endpoint to clean up all transactions and reset financial records across the database."""
    # 1. Delete all transactions
    tx_count = db.query(Transaction).count()
    db.query(Transaction).delete()

    # 2. Reset all payment records to pending/overdue with 0 paid
    today = datetime.now(timezone.utc).date()
    payments = db.query(Payment).all()
    for p in payments:
        p.paid_amount = 0.0
        p.paid_date = None
        p.payment_method = None
        p.status = "overdue" if p.due_date and p.due_date < today else "pending"

    db.commit()
    AuditService.log_action(db, current_user.id, current_user.username, "CLEANUP_FINANCIAL_DATA", "System", "all", new_values={"deleted_transactions": tx_count, "reset_payments": len(payments)})
    return {
        "message": f"Successfully cleaned up {tx_count} transactions and reset all financial records in the database.",
        "deleted_transactions": tx_count,
        "reset_payments": len(payments)
    }
