from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.models.user import User
from app.models.resident import Resident
from app.core.dependencies import get_current_user, get_current_active_admin
from app.core.security import get_password_hash
from app.services.audit_service import AuditService

router = APIRouter()

class UserListItem(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: bool
    is_approved: bool = False
    display_name: Optional[str] = None
    resident_id: Optional[str] = None
    flat_number: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: Optional[str] = None # super-admin, admin, manager, viewer
    new_role: Optional[str] = None
    is_active: Optional[bool] = None
    resident_id: Optional[str] = None

class UserCreateAdmin(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "viewer"
    display_name: Optional[str] = None
    resident_id: Optional[str] = None

@router.get("", response_model=List[UserListItem])
def list_users(db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    """List all registered users with their roles and flat assignments."""
    users = db.query(User).all()
    results = []
    for u in users:
        flat_num = None
        if u.resident_id:
            res = db.query(Resident).filter(Resident.id == u.resident_id).first()
            if res:
                flat_num = f"{res.block}-{res.flat_number}"
        results.append(UserListItem(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            is_approved=bool(u.is_approved if u.role == "viewer" else True),
            display_name=u.display_name,
            resident_id=u.resident_id,
            flat_number=flat_num,
            created_at=u.created_at
        ))
    return results

@router.post("", response_model=UserListItem)
def create_user_by_admin(user_in: UserCreateAdmin, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    existing = db.query(User).filter((User.username == user_in.username) | (User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    norm_role = str(user_in.role or "viewer").strip().lower().replace("_", "-").replace(" ", "-")
    if norm_role in ["super-admin", "superadmin"] and current_user.role not in ["super-admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only super-admin can create super-admin accounts")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
        is_active=True,
        display_name=user_in.display_name or user_in.username,
        resident_id=user_in.resident_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    AuditService.log_action(db, current_user.id, current_user.username, "CREATE", "User", new_user.id, new_values={"username": new_user.username, "role": new_user.role})

    return UserListItem(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        role=new_user.role,
        is_active=new_user.is_active,
        display_name=new_user.display_name,
        resident_id=new_user.resident_id,
        created_at=new_user.created_at
    )

class AccessCodeRequest(BaseModel):
    access_code: str

@router.get("/access-code")
def get_resident_access_code(db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    """Admin endpoint to retrieve the current fast-track resident access code."""
    from app.models.setting import AppSetting
    import json
    row = db.query(AppSetting).filter(AppSetting.key == "resident_access_code").first()
    code = "NNGNB2026"
    if row:
        try:
            code = json.loads(row.value)
        except Exception:
            code = row.value
    return {"access_code": code}

@router.put("/access-code")
def update_resident_access_code(
    payload: AccessCodeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin)
):
    """Admin endpoint to configure or update the resident fast-track access code."""
    from app.models.setting import AppSetting
    import json
    new_code = payload.access_code.strip()
    if not new_code:
        raise HTTPException(status_code=400, detail="Access code cannot be empty")

    row = db.query(AppSetting).filter(AppSetting.key == "resident_access_code").first()
    if not row:
        row = AppSetting(key="resident_access_code", value=json.dumps(new_code))
        db.add(row)
    else:
        row.value = json.dumps(new_code)
    db.commit()

    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE_ACCESS_CODE", "Setting", "resident_access_code", new_values={"access_code": new_code})
    return {"message": "Resident access code updated successfully", "access_code": new_code}

@router.put("/{id}/role", response_model=UserListItem)
def update_user_role(
    id: int, 
    role_in: Optional[UserRoleUpdate] = None, 
    new_role: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_active_admin)
):
    target_user = db.query(User).filter(User.id == id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Protection: Super admin user access cannot be changed by any other user (neither admin nor any other super admin)
    if target_user.role in ["super-admin", "superadmin"]:
        raise HTTPException(
            status_code=403, 
            detail="Super admin user access cannot be changed by any other user, including admin or another super admin."
        )

    target_role = (role_in.role if role_in and role_in.role else None) or (role_in.new_role if role_in and role_in.new_role else None) or new_role or role
    if not target_role:
        raise HTTPException(status_code=400, detail="Role must be provided")

    # Normalize role
    target_role = str(target_role).strip().lower().replace("_", "-").replace(" ", "-")
    if "viewer" in target_role:
        target_role = "viewer"
    elif "super" in target_role:
        target_role = "super-admin"
    elif "admin" in target_role:
        target_role = "admin"
    elif "manager" in target_role:
        target_role = "manager"

    # Protection: Only super-admin can assign super-admin role
    if target_role in ["super-admin", "superadmin"] and current_user.role not in ["super-admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only super-admin can grant super-admin role")

    old_role = target_user.role
    target_user.role = target_role
    if target_role in ["admin", "super-admin", "manager"]:
        target_user.is_approved = True

    if role_in and role_in.is_active is not None:
        target_user.is_active = role_in.is_active
    if role_in and role_in.resident_id is not None:
        target_user.resident_id = str(role_in.resident_id) if role_in.resident_id else None

    db.commit()
    db.refresh(target_user)

    flat_num = None
    if target_user.resident:
        flat_num = f"{target_user.resident.block}-{target_user.resident.flat_number}"

    AuditService.log_action(db, current_user.id, current_user.username, "UPDATE_ROLE", "User", target_user.id, old_values={"role": old_role}, new_values={"role": target_user.role, "resident_id": target_user.resident_id})

    return UserListItem(
        id=target_user.id,
        username=target_user.username,
        email=target_user.email,
        role=target_user.role,
        is_active=target_user.is_active,
        display_name=target_user.display_name,
        resident_id=target_user.resident_id,
        flat_number=flat_num,
        created_at=target_user.created_at
    )

class UserFlatAssign(BaseModel):
    resident_id: Optional[int] = None

@router.put("/{id}/flat", response_model=UserListItem)
def assign_user_flat(id: int, flat_in: UserFlatAssign, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    """Allot / map a flat unit to a user directly from Admin / Super Admin RBAC panel."""
    target_user = db.query(User).filter(User.id == id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role in ["super-admin", "superadmin"] and current_user.id != target_user.id:
        raise HTTPException(status_code=403, detail="Super admin user flat assignment cannot be modified by another user.")

    old_res = target_user.resident_id
    if flat_in.resident_id:
        res = db.query(Resident).filter(Resident.id == flat_in.resident_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Selected Flat does not exist")
        target_user.resident_id = str(flat_in.resident_id)
    else:
        target_user.resident_id = None

    db.commit()
    db.refresh(target_user)

    flat_num = None
    if target_user.resident:
        flat_num = f"{target_user.resident.block}-{target_user.resident.flat_number}"

    AuditService.log_action(db, current_user.id, current_user.username, "ASSIGN_FLAT", "User", target_user.id, old_values={"resident_id": old_res}, new_values={"resident_id": target_user.resident_id})

    return UserListItem(
        id=target_user.id,
        username=target_user.username,
        email=target_user.email,
        role=target_user.role,
        is_active=target_user.is_active,
        display_name=target_user.display_name,
        resident_id=target_user.resident_id,
        flat_number=flat_num,
        created_at=target_user.created_at
    )

@router.put("/{id}/approve")
def approve_user(id: int, approve: bool = True, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    """Admit/approve or revoke resident portal access."""
    target_user = db.query(User).filter(User.id == id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user.role in ["super-admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access is permanent and cannot be modified or revoked.")

    old_approved = target_user.is_approved
    target_user.is_approved = approve
    db.commit()
    db.refresh(target_user)

    AuditService.log_action(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="ADMIT_RESIDENT" if approve else "REVOKE_RESIDENT",
        entity_type="User",
        entity_id=target_user.id,
        old_values={"is_approved": old_approved},
        new_values={"is_approved": approve}
    )
    return {"message": "Resident admitted successfully" if approve else "Admission revoked", "is_approved": target_user.is_approved}

@router.delete("/{id}")
def delete_user(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_active_admin)):
    if id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    u = db.query(User).filter(User.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.role in ["super-admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin user accounts are protected and cannot be deleted.")
    db.delete(u)
    db.commit()
    AuditService.log_action(db, current_user.id, current_user.username, "DELETE", "User", id)
    return {"message": "User deleted successfully"}
