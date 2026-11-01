from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.schemas.payment import PaymentCreate, PaymentUpdate, PaymentResponse
from app.repositories.payment_repository import payment_repo
from app.repositories.resident_repository import resident_repo
from app.models.payment import Payment
from app.models.resident import Resident
from app.models.alert import Alert
from app.models.transaction import Transaction
from app.models.user import User
from app.core.dependencies import get_current_user, get_current_manager_or_admin, get_current_active_admin
from app.services.audit_service import AuditService

router = APIRouter()


class GenerateMonthlyRequest(BaseModel):
    month: Optional[str] = None
    due_date: Optional[date] = None
    due_amount: Optional[float] = 2750.0

class PaymentDetailedResponse(PaymentResponse):
    resident_name: Optional[str] = None
    unit: Optional[str] = None
    unit_number: Optional[str] = None
    block: Optional[str] = None
    flat_number: Optional[str] = None

@router.get("", response_model=List[PaymentDetailedResponse])
def get_payments(
    month: Optional[str] = None,
    status: Optional[str] = None,
    resident_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Payment)
    
    # Filter by specific resident_id if explicitly queried
    if resident_id:
        query = query.filter(Payment.resident_id == resident_id)

    query = query.join(Resident, Payment.resident_id == Resident.id)
    if month:
        query = query.filter(Payment.month == month)
    if status and status != "all":
        query = query.filter(Payment.status == status)

    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
        # Privacy restriction: viewers can only view maintenance payments for their own flat
        user_unit = None
        if current_user.resident_id:
            user_res = db.query(Resident).filter(Resident.id == int(current_user.resident_id)).first()
            if user_res:
                user_unit = user_res.unit_number
        if not user_unit and getattr(current_user, 'unit_number', None):
            user_unit = current_user.unit_number
        if not user_unit and current_user.email:
            res_by_email = db.query(Resident).filter(Resident.owner_email == current_user.email).first()
            if res_by_email:
                user_unit = res_by_email.unit_number

        if user_unit:
            query = query.filter(Resident.unit_number == user_unit)
        elif current_user.resident_id:
            query = query.filter(Payment.resident_id == int(current_user.resident_id))
        else:
            return []

    payments = query.all()
    results = []
    for p in payments:
        res = db.query(Resident).filter(Resident.id == p.resident_id).first()
        res_name = res.owner_name if res else "Unknown"
        unit_str = res.unit_number if res else ""
        results.append(PaymentDetailedResponse(
            id=p.id,
            resident_id=p.resident_id,
            month=p.month,
            due_amount=p.due_amount,
            paid_amount=p.paid_amount,
            due_date=p.due_date,
            paid_date=p.paid_date,
            status=p.status,
            penalty_amount=p.penalty_amount,
            payment_method=p.payment_method,
            notes=p.notes,
            created_at=p.created_at,
            updated_at=p.updated_at,
            resident_name=res_name,
            unit=unit_str,
            unit_number=unit_str,
            block=res.block if res else "",
            flat_number=res.flat_number if res else ""
        ))

    def _payment_sort_key(item):
        unit = (item.unit or item.unit_number or "").upper().strip()
        block = (item.block or "").upper().strip()
        flat = (item.flat_number or "").upper().strip()
        if not unit and block and flat:
            unit = f"{block}-{flat}"
        
        block_score = 2000
        remainder = unit
        if unit.startswith("NNG"):
            block_score = 0
            remainder = unit[3:].lstrip("-_ ")
        elif unit.startswith("NB"):
            block_score = 1000
            remainder = unit[2:].lstrip("-_ ")
        elif block == "NNG":
            block_score = 0
            remainder = flat
        elif block == "NB":
            block_score = 1000
            remainder = flat

        floor_score = 90
        if remainder.startswith("GF") or remainder.startswith("G") or "GROUND" in remainder:
            floor_score = 10
        elif remainder.startswith("FF") or remainder.startswith("F") or remainder.startswith("1F") or "FIRST" in remainder:
            floor_score = 20
        elif remainder.startswith("SF") or remainder.startswith("S") or remainder.startswith("2F") or "SECOND" in remainder:
            floor_score = 30
        elif remainder.startswith("TF") or remainder.startswith("T") or remainder.startswith("3F") or "THIRD" in remainder:
            floor_score = 40
        elif remainder.startswith("PH") or "PENTHOUSE" in remainder:
            floor_score = 50

        import re
        m = re.search(r'\d+', remainder)
        num_score = int(m.group(0)) if m else 0
        return (block_score, floor_score, num_score, unit)

    results.sort(key=_payment_sort_key)
    return results

@router.put("/{id}", response_model=PaymentDetailedResponse)
def update_payment(
    id: int,
    payment_in: PaymentUpdate,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    payment = payment_repo.get(db, id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Update payment
    old_data = {"paid_amount": payment.paid_amount, "status": payment.status, "resident_id": payment.resident_id, "due_amount": payment.due_amount}
    update_dict = payment_in.model_dump(exclude_unset=True)

    is_admin = current_user.role in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
        # Check authorization: resident can only update their own flat's payment
        user_res_id = getattr(current_user, "resident_id", None)
        user_email = (getattr(current_user, "email", "") or "").lower()
        user_unit = getattr(current_user, "unit_number", None) or getattr(current_user, "flat_number", None)
        res = db.query(Resident).filter(Resident.id == payment.resident_id).first()
        is_owner = False
        if user_res_id and payment.resident_id == user_res_id:
            is_owner = True
        elif res and res.owner_email and res.owner_email.lower() == user_email:
            is_owner = True
        elif res and user_unit and (res.unit_number == user_unit or f"{res.block}{res.flat_number}" == user_unit):
            is_owner = True
        
        if not is_owner:
            raise HTTPException(status_code=403, detail="You are only authorized to update payments for your own flat.")
        
        # Prevent non-admin from modifying due_amount or resident_id
        update_dict.pop("resident_id", None)
        update_dict.pop("due_amount", None)
    
    already_billed = bool(update_dict.pop("already_billed", False) or update_dict.pop("skip_transaction", False))
    eff_due = update_dict.get("due_amount", payment.due_amount)

    if already_billed:
        # Resident already paid previously (advance / carryover) - mark paid without recording duplicate income transaction
        update_dict["status"] = "paid"
        if not update_dict.get("paid_amount"):
            update_dict["paid_amount"] = eff_due
        if not update_dict.get("paid_date"):
            update_dict["paid_date"] = datetime.now(timezone.utc).date()
        
        note_tag = "[Settled via advance payment - already billed]"
        cur_notes = update_dict.get("notes") or payment.notes or ""
        if note_tag not in cur_notes:
            update_dict["notes"] = f"{cur_notes} {note_tag}".strip()
    
    # If marking as paid or adjusting bill/due_amount, sync status
    new_paid = update_dict.get("paid_amount", payment.paid_amount)
    if new_paid >= eff_due and "status" not in update_dict:
        update_dict["status"] = "paid"
        if not update_dict.get("paid_date"):
            update_dict["paid_date"] = datetime.now(timezone.utc).date()
    elif new_paid > 0 and new_paid < eff_due and "status" not in update_dict:
        update_dict["status"] = "partial"
    elif new_paid == 0 and "status" not in update_dict:
        if payment.due_date and payment.due_date < datetime.now(timezone.utc).date():
            update_dict["status"] = "overdue"
        else:
            update_dict["status"] = "pending"

    payment = payment_repo.update(db, payment, update_dict)
    
    # Explicitly use the paid_date updated by the admin in the portal
    tx_date = update_dict.get("paid_date") or payment.paid_date
    if isinstance(tx_date, str):
        try:
            tx_date = datetime.strptime(tx_date, "%Y-%m-%d").date()
        except Exception:
            pass
    if not tx_date:
        tx_date = datetime.now(timezone.utc).date()

    # Sync with Transactions as the Single Source of Truth
    res = db.query(Resident).filter(Resident.id == payment.resident_id).first()

    existing_tx = db.query(Transaction).filter(
        (Transaction.payment_id == payment.id) |
        ((Transaction.resident_id == payment.resident_id) & 
         (Transaction.description.like(f"Maintenance {payment.month}%")) & 
         (Transaction.transaction_type == "income"))
    ).first()

    if already_billed:
        # Skip creating a duplicate transaction to prevent double counting in ledger/passbook
        pass
    elif new_paid > 0:
        if existing_tx:
            existing_tx.amount = new_paid
            existing_tx.transaction_date = tx_date
            existing_tx.payment_id = payment.id
            existing_tx.resident_id = payment.resident_id
            existing_tx.description = f"Maintenance {payment.month} - {res.unit_number if res else ''}"
        else:
            tx = Transaction(
                transaction_date=tx_date,
                description=f"Maintenance {payment.month} - {res.unit_number if res else ''}",
                category="maintenance",
                transaction_type="income",
                amount=new_paid,
                resident_id=payment.resident_id,
                payment_id=payment.id,
                created_by=current_user.id
            )
            db.add(tx)
        db.commit()
    else:
        # If payment is marked as unpaid (paid_amount=0), remove any associated transaction
        if existing_tx:
            db.delete(existing_tx)
            db.commit()

    AuditService.log_action(
        db, current_user.id, current_user.username, "UPDATE", "Payment", str(payment.id),
        old_values=old_data,
        new_values={**update_dict, "already_billed": already_billed, "duplicate_tx_skipped": already_billed},
        request=request
    )
    
    res = db.query(Resident).filter(Resident.id == payment.resident_id).first()
    return PaymentDetailedResponse(
        id=payment.id,
        resident_id=payment.resident_id,
        month=payment.month,
        due_amount=payment.due_amount,
        paid_amount=payment.paid_amount,
        due_date=payment.due_date,
        paid_date=payment.paid_date,
        status=payment.status,
        penalty_amount=payment.penalty_amount,
        payment_method=payment.payment_method,
        notes=payment.notes,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
        resident_name=res.owner_name if res else "",
        unit=res.unit_number if res else "",
        block=res.block if res else "",
        flat_number=res.flat_number if res else ""
    )


@router.post("/generate-monthly")
def generate_monthly_payments(
    payload: Optional[GenerateMonthlyRequest] = None,
    month: Optional[str] = Query(None),
    due_date: Optional[date] = Query(None),
    due_amount: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_manager_or_admin)
):
    """Generate monthly maintenance bills (default 2750 INR)."""
    # Resolve month from payload or query param, or current month
    eff_month = (payload.month if payload and payload.month else None) or month or datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Resolve due_amount
    eff_amount = 2750.0
    if payload and payload.due_amount is not None:
        eff_amount = float(payload.due_amount)
    elif due_amount is not None:
        eff_amount = float(due_amount)

    # Resolve due_date
    eff_due_date = (payload.due_date if payload and payload.due_date else None) or due_date
    if not eff_due_date:
        try:
            # Default to the 10th of the target month
            parts = eff_month.split("-")
            eff_due_date = date(int(parts[0]), int(parts[1]), 10)
        except Exception:
            eff_due_date = datetime.now(timezone.utc).date()

    month = eff_month
    due_date = eff_due_date
    due_amount = eff_amount

    all_residents = resident_repo.get_all(db)
    generated = 0
    auto_deducted = 0

    # Ensure strictly 1 bill per unit flat (society has 25 total flats: NNG-GF1..TF3 & NB-GF1..PH1)
    # Prefer primary 'owner' or 'tenant' resident for the flat
    unit_map = {}
    for res in all_residents:
        if not res.is_active:
            continue
        unit = res.unit_number
        if unit not in unit_map:
            unit_map[unit] = res
        else:
            # Prioritize purchaser (owner/tenant) over family_member or builder
            if unit_map[unit].ownership_type in ['family_member', 'builder'] and res.ownership_type in ['owner', 'tenant']:
                unit_map[unit] = res

    for unit, resident in unit_map.items():
        # Check if any payment already exists for this unit in the target month
        existing_unit_payment = (
            db.query(Payment)
            .join(Resident, Payment.resident_id == Resident.id)
            .filter(Resident.unit_number == unit, Payment.month == month)
            .first()
        )
        if not existing_unit_payment:
            payment_repo.create(db, {
                "resident_id": resident.id,
                "month": month,
                "due_amount": due_amount,
                "paid_amount": 0.0,
                "due_date": due_date,
                "paid_date": None,
                "status": "pending",
                "notes": None
            })
            generated += 1

    db.commit()
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Payment", "batch", new_values={"month": month, "count": generated})
    return {
        "message": f"Generated {generated} maintenance bills for {month}",
        "generated": generated
    }

@router.post("/check-overdue")
def check_overdue(db: Session = Depends(get_db), current_user = Depends(get_current_manager_or_admin)):
    payments = payment_repo.get_all(db)
    today = datetime.now(timezone.utc).date()
    alerts_created = 0
    for payment in payments:
        if payment.status in ["pending", "partial"] and payment.due_date < today:
            payment.status = "overdue"
            db.commit()
            
            existing_alert = db.query(Alert).filter(
                Alert.resident_id == payment.resident_id,
                Alert.alert_type == "overdue_payment",
                Alert.is_resolved == False
            ).first()
            if not existing_alert:
                res = db.query(Resident).filter(Resident.id == payment.resident_id).first()
                unit_name = res.unit_number if res else f"Resident #{payment.resident_id}"
                alert = Alert(
                    alert_type="overdue_payment",
                    severity="warning",
                    title="Overdue Payment",
                    message=f"Payment overdue for unit {unit_name} ({payment.month}) - Due: ₹{payment.due_amount - payment.paid_amount}",
                    resident_id=payment.resident_id
                )
                db.add(alert)
                db.commit()
                alerts_created += 1
    return {"message": f"Checked overdue. {alerts_created} alerts created."}

@router.post("/{id}/remind")
def send_payment_reminder_single(
    id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin)
):
    """Admin / Super Admin sends alert and email notification to the resident of a specific flat."""
    payment = payment_repo.get(db, id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    due_balance = float(payment.due_amount or 0.0) - float(payment.paid_amount or 0.0)
    if due_balance <= 0 or payment.status == "paid":
        raise HTTPException(status_code=400, detail="This bill is already paid.")

    resident = db.query(Resident).filter(Resident.id == payment.resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    unit_name = resident.unit_number
    title = f"Maintenance Due Alert - {unit_name}"
    msg = f"Reminder: Maintenance bill for {unit_name} ({payment.month}) of ₹{due_balance:,.2f} is pending. Please clear before due date."

    # 1. Create or update alert for this resident
    alert = Alert(
        alert_type="payment_reminder",
        severity="warning",
        title=title,
        message=msg,
        resident_id=resident.id,
        is_resolved=False
    )
    db.add(alert)
    db.commit()

    # 2. Find target email (resident's owner_email or any registered user account linked to this resident)
    to_email = resident.owner_email
    if not to_email:
        linked_user = db.query(User).filter(User.resident_id == str(resident.id)).first()
        if linked_user and linked_user.email:
            to_email = linked_user.email

    from app.services.email_service import EmailService
    email_sent = False
    if to_email:
        email_sent = EmailService.send_payment_reminder(
            to_email=to_email,
            resident_name=resident.owner_name,
            unit_number=unit_name,
            month=payment.month,
            due_amount=due_balance,
            due_date=str(payment.due_date) if payment.due_date else None
        )

    AuditService.log_action(
        db, current_user.id, current_user.username, "REMIND_PAYMENT", "Payment", payment.id,
        new_values={"unit": unit_name, "resident": resident.owner_name, "email": to_email, "email_sent": email_sent}
    )

    return {
        "message": f"Alert & email reminder sent to {resident.owner_name} ({unit_name})",
        "email_sent": email_sent,
        "recipient": to_email or "No email registered (In-app dashboard alert created)",
        "unit": unit_name
    }

@router.post("/remind-all-unpaid")
def send_payment_reminder_all_unpaid(
    month: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin)
):
    """Admin / Super Admin sends alert and email notifications to ALL flats with pending maintenance dues."""
    eff_month = month or datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Query all unpaid payments for this month
    payments = (
        db.query(Payment)
        .join(Resident, Payment.resident_id == Resident.id)
        .filter(Payment.month == eff_month, Payment.status != "paid")
        .all()
    )

    if not payments:
        return {
            "message": f"All flats have already cleared maintenance for {eff_month}! No alerts needed.",
            "total_unpaid": 0,
            "reminders_sent": 0
        }

    from app.services.email_service import EmailService
    from app.models.user import User

    reminders_sent = 0
    emails_dispatched = 0
    notified_units = []

    for payment in payments:
        due_balance = float(payment.due_amount or 0.0) - float(payment.paid_amount or 0.0)
        if due_balance <= 0:
            continue

        resident = db.query(Resident).filter(Resident.id == payment.resident_id).first()
        if not resident:
            continue

        unit_name = resident.unit_number
        title = f"Maintenance Due Alert - {unit_name}"
        msg = f"Reminder: Maintenance bill for {unit_name} ({payment.month}) of ₹{due_balance:,.2f} is pending. Please clear before due date."

        # In-app alert
        alert = Alert(
            alert_type="payment_reminder",
            severity="warning",
            title=title,
            message=msg,
            resident_id=resident.id,
            is_resolved=False
        )
        db.add(alert)
        reminders_sent += 1
        notified_units.append(unit_name)

        # Email dispatch
        to_email = resident.owner_email
        if not to_email:
            linked_user = db.query(User).filter(User.resident_id == str(resident.id)).first()
            if linked_user and linked_user.email:
                to_email = linked_user.email

        if to_email:
            sent = EmailService.send_payment_reminder(
                to_email=to_email,
                resident_name=resident.owner_name,
                unit_number=unit_name,
                month=payment.month,
                due_amount=due_balance,
                due_date=str(payment.due_date) if payment.due_date else None
            )
            if sent:
                emails_dispatched += 1

    db.commit()

    AuditService.log_action(
        db, current_user.id, current_user.username, "REMIND_ALL_UNPAID", "Payment", "batch",
        new_values={"month": eff_month, "reminders_sent": reminders_sent, "emails_dispatched": emails_dispatched, "units": notified_units}
    )

    return {
        "message": f"Successfully sent payment reminders to {reminders_sent} unpaid flats ({emails_dispatched} emails sent) for {eff_month}.",
        "total_unpaid": len(payments),
        "reminders_sent": reminders_sent,
        "emails_dispatched": emails_dispatched,
        "notified_units": notified_units
    }

