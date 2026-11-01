from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.resident import Resident
from app.schemas.resident import ResidentCreate, ResidentUpdate, ResidentResponse
from app.repositories.resident_repository import resident_repo
from app.core.dependencies import get_current_user, get_current_manager_or_admin
from app.services.audit_service import AuditService

router = APIRouter()

def _can_manage_resident(current_user, target_resident: Resident, db: Session) -> bool:
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    if cleaned in ["admin", "super-admin", "superadmin", "manager"]:
        return True
    # If not admin, check if current_user is owner or member of this resident's flat
    user_unit = getattr(current_user, "unit_number", None) or getattr(current_user, "flat_number", None)
    if user_unit and target_resident.unit_number and user_unit.strip().upper() == target_resident.unit_number.strip().upper():
        return True
    if current_user.resident_id:
        user_res = db.query(Resident).filter(Resident.id == current_user.resident_id).first()
        if user_res and user_res.unit_number == target_resident.unit_number:
            return True
    if getattr(current_user, "email", None) and target_resident.owner_email:
        if current_user.email.strip().lower() == target_resident.owner_email.strip().lower():
            return True
    return False

@router.get("", response_model=List[ResidentResponse])
def get_residents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    residents = resident_repo.get_all(db, skip=skip, limit=limit)
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if is_admin:
        return residents

    # Determine user's flat to mask personal contact info for other flats
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

    results = []
    for r in residents:
        is_own = bool(user_unit and r.unit_number and user_unit.strip().upper() == r.unit_number.strip().upper())
        resp = ResidentResponse.model_validate(r)
        if not is_own:
            resp.owner_phone = "—"
            resp.alternate_phone = None
            resp.owner_email = "—"
            resp.notes = None
        results.append(resp)
    return results

@router.post("", response_model=ResidentResponse)
def create_resident(resident_in: ResidentCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
        if not resident_in.owner_email or not str(resident_in.owner_email).strip():
            raise HTTPException(status_code=400, detail="Email is required for resident registration")
        if not resident_in.owner_phone or not str(resident_in.owner_phone).strip():
            raise HTTPException(status_code=400, detail="Phone number is required for resident registration")
        if not current_user.resident_id:
            raise HTTPException(status_code=403, detail="Only flat owners or admins can add residents")
        user_res = db.query(Resident).filter(Resident.id == current_user.resident_id).first()
        if not user_res or user_res.unit_number != resident_in.unit_number or (user_res.ownership_type or "").lower() != "owner":
            raise HTTPException(status_code=403, detail="Only flat owners can add residents to this unit")
            
    resident = resident_repo.create(db, resident_in.model_dump())
    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "Resident", resident.id, new_values=resident_in.model_dump())
    return resident

@router.get("/{id}", response_model=ResidentResponse)
def get_resident(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
        
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if is_admin:
        return resident

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

    is_own = bool(user_unit and resident.unit_number and user_unit.strip().upper() == resident.unit_number.strip().upper())
    resp = ResidentResponse.model_validate(resident)
    if not is_own:
        resp.owner_phone = "—"
        resp.alternate_phone = None
        resp.owner_email = "—"
        resp.notes = None
    return resp

@router.put("/{id}", response_model=ResidentResponse)
def update_resident(id: int, resident_in: ResidentUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    if not _can_manage_resident(current_user, resident, db):
        raise HTTPException(status_code=403, detail="Only the flat owner or admin can update this resident")

    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
        updated_dict = resident_in.model_dump(exclude_unset=True)
        target_email = updated_dict.get("owner_email", resident.owner_email)
        target_phone = updated_dict.get("owner_phone", resident.owner_phone)
        if not target_email or not str(target_email).strip():
            raise HTTPException(status_code=400, detail="Email is required when editing resident details")
        if not target_phone or not str(target_phone).strip():
            raise HTTPException(status_code=400, detail="Phone number is required when editing resident details")

    old_data = {k: getattr(resident, k) for k in resident_in.model_dump(exclude_unset=True).keys()}
    resident = resident_repo.update(db, resident, resident_in.model_dump(exclude_unset=True))
    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE", "Resident", resident.id, old_values=old_data, new_values=resident_in.model_dump(exclude_unset=True))
    return resident

@router.patch("/{id}/status", response_model=ResidentResponse)
@router.put("/{id}/toggle-status", response_model=ResidentResponse)
@router.put("/{id}/status", response_model=ResidentResponse)
def toggle_resident_status(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    if not _can_manage_resident(current_user, resident, db):
        raise HTTPException(status_code=403, detail="Only the flat owner or admin can change active status")
    
    old_status = resident.is_active
    new_status = not old_status
    resident.is_active = new_status
    db.commit()
    db.refresh(resident)
    
    status_str = "Active" if new_status else "Inactive"
    AuditService.log_action(
        db, current_user.id, current_user.username, 
        "UPDATE", "Resident", resident.id, 
        old_values={"is_active": old_status}, 
        new_values={"is_active": new_status, "owner_name": resident.owner_name, "unit_number": resident.unit_number},
        description=f"{current_user.username} marked resident {resident.owner_name} ({resident.unit_number}) as {status_str}"
    )
    return resident

@router.delete("/{id}")
def delete_resident(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Residents and flat owners cannot permanently delete resident records. You can toggle them as Active or Inactive instead, or contact the society administrator."
        )
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    old_info = {"owner_name": resident.owner_name, "unit_number": resident.unit_number}

    from app.models.user import User
    from app.models.transaction import Transaction
    from app.models.task import Task
    from app.models.alert import Alert
    from app.models.vehicle import Vehicle

    try:
        db.query(User).filter(User.resident_id == str(id)).update({"resident_id": None}, synchronize_session=False)
    except Exception:
        pass

    try:
        db.query(Transaction).filter(Transaction.resident_id == id).update({"resident_id": None}, synchronize_session=False)
    except Exception:
        pass

    try:
        db.query(Alert).filter(Alert.resident_id == id).update({"resident_id": None}, synchronize_session=False)
    except Exception:
        pass

    try:
        db.query(Task).filter(Task.resident_id == str(id)).update({"resident_id": None}, synchronize_session=False)
    except Exception:
        pass

    try:
        db.query(Vehicle).filter(Vehicle.resident_id == str(id)).delete(synchronize_session=False)
    except Exception:
        pass

    db.delete(resident)
    db.commit()

    AuditService.log_action(
        db, current_user.id, current_user.username, "DELETE", "Resident", id,
        old_values=old_info,
        description=f"{current_user.username} deleted resident {old_info['owner_name']} from flat {old_info['unit_number']}"
    )
    return {"message": "Resident deleted"}

@router.get("/{id}/payments")
def get_resident_payments(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    from app.models.payment import Payment
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
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

        is_own = bool(user_unit and resident.unit_number and user_unit.strip().upper() == resident.unit_number.strip().upper())
        if not is_own:
            raise HTTPException(status_code=403, detail="Payment records of other flats cannot be viewed.")

    return db.query(Payment).filter(Payment.resident_id == id).order_by(Payment.month.desc()).all()

@router.get("/{id}/transactions")
def get_resident_transactions(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    from app.models.transaction import Transaction
    resident = resident_repo.get(db, id)
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    cleaned = (current_user.role or "").strip().lower().replace("_", "-")
    is_admin = cleaned in ["admin", "super-admin", "superadmin", "manager"]
    if not is_admin:
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

        is_own = bool(user_unit and resident.unit_number and user_unit.strip().upper() == resident.unit_number.strip().upper())
        if not is_own:
            raise HTTPException(status_code=403, detail="Transaction records of other flats cannot be viewed.")

    return db.query(Transaction).filter(Transaction.resident_id == id).all()
