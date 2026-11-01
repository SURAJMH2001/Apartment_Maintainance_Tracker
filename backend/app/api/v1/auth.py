"""Google OAuth & traditional auth endpoints."""
import sys
sys.path.insert(0, 'D:/Apartment_Mainatainance_Tracker/backend/Lib/site-packages')

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.schemas.auth import Token, UserResponse, UserCreate
from app.models.user import User
from app.models.resident import Resident
from app.core.dependencies import get_current_user
from app.core.config import get_settings
from app.services.audit_service import AuditService

settings = get_settings()
router = APIRouter()

class GoogleAuthRequest(BaseModel):
    credential: str
    phone: Optional[str] = None
    dob: Optional[str] = None
    resident_id: Optional[int] = None
    is_visitor: Optional[bool] = False

class OnboardingRequest(BaseModel):
    phone: Optional[str] = None
    dob: Optional[str] = None
    resident_id: Optional[int] = None
    is_visitor: Optional[bool] = False

class GoogleAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    is_new_user: bool = False
    needs_onboarding: bool = False
    user: dict

class RegisterResidentRequest(BaseModel):
    username: str
    email: str
    password: str
    display_name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    resident_id: Optional[int] = None

class LinkFlatRequest(BaseModel):
    resident_id: Optional[int] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    is_visitor: Optional[bool] = False

def verify_google_token(credential: str) -> dict:
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        id_info = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,
        )
        return id_info
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )

class LoginRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
):
    """Traditional username/password login — accepts JSON body or Form-encoded data."""
    username = None
    password = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            pass
    
    if not username or not password:
        # Fallback to form data (e.g. standard OAuth2 form or URLSearchParams)
        try:
            form = await request.form()
            username = form.get("username") or username
            password = form.get("password") or password
        except Exception:
            pass

    # If still not found, parse raw body if URL encoded
    if not username or not password:
        try:
            raw_body = await request.body()
            from urllib.parse import parse_qs
            parsed = parse_qs(raw_body.decode('utf-8'))
            if "username" in parsed:
                username = parsed["username"][0]
            if "password" in parsed:
                password = parsed["password"][0]
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing username or password in request body",
        )

    user = db.query(User).filter((User.username == username) | (User.email == username)).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    unit_str = user.resident.unit_number if user.resident else None
    AuditService.log_action(
        db=db,
        user_id=user.id,
        username=user.display_name or user.username,
        action="LOGIN",
        entity_type="PortalAdmin/Session",
        entity_id=str(user.id),
        new_values={
            "auth_method": "Portal Admin credentials",
            "role": user.role,
            "unit_number": unit_str,
            "email": user.email
        },
        request=request
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.display_name or (user.resident.owner_name if user.resident else None) or user.username,
            "display_name": user.display_name or (user.resident.owner_name if user.resident else None) or user.username,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "avatar": user.avatar_url,
            "resident_id": user.resident_id,
            "unit_number": unit_str,
            "is_approved": True if user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(user.is_approved),
            "needs_onboarding": bool(user.role == "viewer" and not user.resident_id)
        }
    }

@router.post("/register", response_model=Token)
def register_resident(req: RegisterResidentRequest, db: Session = Depends(get_db)):
    """Allow resident to register and link to flat."""
    existing = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already in use")

    res = db.query(Resident).filter(Resident.id == req.resident_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Selected flat resident does not exist")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        role="viewer",
        is_active=True,
        display_name=req.display_name or res.owner_name,
        resident_id=str(req.resident_id)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.display_name,
            "email": user.email,
            "role": user.role,
            "avatar": user.avatar_url,
            "resident_id": user.resident_id,
            "unit_number": res.unit_number if res else None,
            "is_approved": True if user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(user.is_approved),
            "needs_onboarding": bool(user.role == "viewer" and not user.resident_id)
        }
    }

@router.post("/onboarding")
def complete_onboarding(req: OnboardingRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Complete first-time onboarding for Google or newly registered users."""
    if req.phone:
        current_user.phone = req.phone.strip()
    if req.dob:
        current_user.dob = req.dob.strip()

    if req.is_visitor:
        # Mark as a visitor / explorer
        if current_user.role not in ["super-admin", "superadmin", "admin"]:
            current_user.role = "viewer"
        current_user.resident_id = None
    elif req.resident_id:
        res = db.query(Resident).filter(Resident.id == req.resident_id).first()
        if not res:
            raise HTTPException(status_code=404, detail="Selected unit does not exist")
        current_user.resident_id = str(req.resident_id)
        # Also update resident contact info if resident record lacks phone/email
        if not res.owner_phone and req.phone:
            res.owner_phone = req.phone.strip()
        if not res.owner_email and current_user.email:
            res.owner_email = current_user.email

    db.commit()
    db.refresh(current_user)

    unit_str = None
    if current_user.resident:
        unit_str = current_user.resident.unit_number

    return {
        "message": "Onboarding completed successfully",
        "user": {
            "id": current_user.id,
            "name": current_user.display_name or current_user.username,
            "email": current_user.email,
            "phone": current_user.phone,
            "dob": current_user.dob,
            "role": current_user.role,
            "avatar": current_user.avatar_url,
            "resident_id": current_user.resident_id,
            "unit_number": unit_str,
            "is_approved": True if current_user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(current_user.is_approved),
            "needs_onboarding": False
        }
    }

@router.post("/link-flat")
def link_flat(req: LinkFlatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Link current user to a flat resident record."""
    if req.is_visitor:
        current_user.resident_id = None
        db.commit()
        return {"message": "Configured as visitor", "resident_id": None, "unit_number": "Visitor"}

    if not req.resident_id:
        raise HTTPException(status_code=400, detail="resident_id is required")

    res = db.query(Resident).filter(Resident.id == req.resident_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resident flat not found")

    current_user.resident_id = str(req.resident_id)
    if req.phone:
        current_user.phone = req.phone
    if req.dob:
        current_user.dob = req.dob
    db.commit()
    return {"message": "Flat linked successfully", "resident_id": current_user.resident_id, "unit_number": res.unit_number}

@router.post("/google", response_model=GoogleAuthResponse)
def google_login(payload: GoogleAuthRequest, request: Request = None, db: Session = Depends(get_db)):
    id_info = verify_google_token(payload.credential)

    email: str = id_info.get("email", "").lower().strip()
    name: str = id_info.get("name", email.split("@")[0])
    picture: str = id_info.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email")

    user = db.query(User).filter(User.email == email).first()
    is_new = False
    if not user:
        is_new = True
        import secrets
        random_password = secrets.token_urlsafe(32)
        user = User(
            username=email.split("@")[0],
            email=email,
            hashed_password=get_password_hash(random_password),
            role="viewer",
            is_active=True,
            display_name=name,
            avatar_url=picture,
            phone=payload.phone,
            dob=payload.dob,
            resident_id=str(payload.resident_id) if payload.resident_id else None
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update details if provided, but PRESERVE user custom display_name if already set
        if not user.display_name:
            user.display_name = name
        user.avatar_url = picture or user.avatar_url
        if payload.phone and not user.phone:
            user.phone = payload.phone
        if payload.dob and not user.dob:
            user.dob = payload.dob
        if payload.resident_id and not user.resident_id:
            user.resident_id = str(payload.resident_id)
        db.commit()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled. Contact admin.")

    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    unit_str = None
    if user.resident:
        unit_str = user.resident.unit_number

    # A user needs onboarding if they are a viewer and have neither linked a flat nor confirmed as visitor/entered contact
    needs_onboarding = is_new or (user.role == "viewer" and not user.resident_id and not user.phone)

    AuditService.log_action(
        db=db,
        user_id=user.id,
        username=user.display_name or user.username,
        action="LOGIN",
        entity_type="Resident/Session",
        entity_id=str(user.id),
        new_values={
            "auth_method": "Google One-Tap OAuth",
            "role": user.role,
            "unit_number": unit_str,
            "email": user.email,
            "is_new_user": is_new
        },
        request=request
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "is_new_user": is_new,
        "needs_onboarding": needs_onboarding,
        "user": {
            "id": user.id,
            "name": user.display_name or (user.resident.owner_name if user.resident else None) or user.username,
            "display_name": user.display_name or (user.resident.owner_name if user.resident else None) or user.username,
            "username": user.username,
            "email": user.email,
            "phone": user.phone,
            "dob": user.dob,
            "role": user.role,
            "avatar": user.avatar_url,
            "resident_id": user.resident_id,
            "unit_number": unit_str,
            "is_approved": True if user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(user.is_approved),
            "needs_onboarding": needs_onboarding
        },
    }

class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    dob: Optional[str] = None
    resident_id: Optional[int] = None

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    unit_str = current_user.resident.unit_number if current_user.resident else None
    is_app = True if current_user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(current_user.is_approved)
    needs_onb = bool(current_user.role == "viewer" and not current_user.resident_id)
    disp_name = current_user.display_name or (current_user.resident.owner_name if current_user.resident else None) or current_user.username
    return {
        "id": current_user.id,
        "name": disp_name,
        "display_name": disp_name,
        "username": current_user.username,
        "email": current_user.email,
        "phone": current_user.phone,
        "dob": current_user.dob,
        "role": current_user.role,
        "avatar": current_user.avatar_url,
        "resident_id": current_user.resident_id,
        "unit_number": unit_str,
        "is_approved": is_app,
        "needs_onboarding": needs_onb,
        "is_active": current_user.is_active
    }

@router.put("/me")
def update_me(req: UpdateProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Allow user/owner to update their profile, multiple contacts (phone, alternate phone), email, and flat link."""
    # Check email uniqueness if changing email
    if req.email and req.email.strip().lower() != current_user.email.lower():
        existing = db.query(User).filter(User.email == req.email.strip().lower()).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="This email is already in use by another account")
        current_user.email = req.email.strip().lower()

    if req.display_name is not None:
        current_user.display_name = req.display_name.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip()
    if req.dob is not None:
        current_user.dob = req.dob.strip()

    # If user has or links to a resident record, also synchronize phone/alternate_phone/email
    target_res_id = req.resident_id if req.resident_id is not None else (int(current_user.resident_id) if current_user.resident_id else None)
    if req.resident_id is not None:
        if req.resident_id > 0:
            res = db.query(Resident).filter(Resident.id == req.resident_id).first()
            if not res:
                raise HTTPException(status_code=404, detail="Selected Flat does not exist")
            current_user.resident_id = str(req.resident_id)
        else:
            current_user.resident_id = None

    if target_res_id and target_res_id > 0:
        res = db.query(Resident).filter(Resident.id == target_res_id).first()
        if res:
            if req.display_name:
                res.owner_name = req.display_name.strip()
            if req.email:
                res.owner_email = req.email.strip().lower()
            if req.phone:
                res.owner_phone = req.phone.strip()
            if req.alternate_phone is not None:
                res.alternate_phone = req.alternate_phone.strip()

    db.commit()
    db.refresh(current_user)

    unit_str = None
    if current_user.resident:
        unit_str = current_user.resident.unit_number

    is_app = True if current_user.role in ["admin", "super-admin", "superadmin", "manager"] else bool(current_user.is_approved)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "name": current_user.display_name or current_user.username,
            "email": current_user.email,
            "phone": current_user.phone,
            "dob": current_user.dob,
            "role": current_user.role,
            "avatar": current_user.avatar_url,
            "resident_id": current_user.resident_id,
            "unit_number": unit_str,
            "is_approved": is_app,
            "needs_onboarding": False
        }
    }

class ClaimAccessCodeRequest(BaseModel):
    access_code: str

@router.post("/claim-access-code")
def claim_access_code(
    payload: ClaimAccessCodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bypass waiting room if user provides the valid resident fast-track access code."""
    import json
    from app.models.setting import AppSetting
    from app.services.audit_service import AuditService

    row = db.query(AppSetting).filter(AppSetting.key == "resident_access_code").first()
    valid_code = "NNGNB2026"
    if row:
        try:
            valid_code = json.loads(row.value)
        except Exception:
            valid_code = row.value

    user_code = payload.access_code.strip()
    if not user_code or user_code.upper() != valid_code.upper():
        raise HTTPException(
            status_code=400,
            detail="Invalid access code. Please check with your society management committee."
        )

    current_user.is_approved = True
    db.commit()
    db.refresh(current_user)

    AuditService.log_action(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="ACCESS_CODE_ADMISSION",
        entity_type="User",
        entity_id=current_user.id,
        new_values={"is_approved": True, "method": "access_code"}
    )

    unit_str = current_user.resident.unit_number if current_user.resident else None
    return {
        "success": True,
        "message": "Access code verified successfully! You have been admitted into SocietyTrack.",
        "user": {
            "id": current_user.id,
            "name": current_user.display_name or current_user.username,
            "username": current_user.username,
            "email": current_user.email,
            "phone": current_user.phone,
            "dob": current_user.dob,
            "role": current_user.role,
            "avatar": current_user.avatar_url,
            "resident_id": current_user.resident_id,
            "unit_number": unit_str,
            "is_approved": True,
            "needs_onboarding": False,
            "is_active": current_user.is_active
        }
    }


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log out resident/user and record in audit logs."""
    unit_str = current_user.resident.unit_number if current_user.resident else None
    AuditService.log_action(
        db,
        user_id=current_user.id,
        username=current_user.display_name or current_user.username,
        action="LOGOUT",
        entity_type="Resident/Session",
        entity_id=str(current_user.id),
        new_values={
            "role": current_user.role,
            "unit_number": unit_str,
            "email": current_user.email
        },
        request=request
    )
    return {"message": "Logged out successfully"}

