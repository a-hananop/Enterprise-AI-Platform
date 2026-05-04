"""
Authentication API — Login, Register, Profile, User Management
Full RBAC: admin > manager > analyst > viewer
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models import User, UserRole, ActivityLog
from app.utils.auth import (
    verify_password, get_password_hash,
    create_access_token, get_current_user, get_admin_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Role permissions map ──────────────────────────────────────
ROLE_PERMISSIONS = {
    "admin":   ["read", "write", "delete", "manage_users", "view_logs", "admin"],
    "manager": ["read", "write", "delete", "view_logs"],
    "analyst": ["read", "write"],
    "viewer":  ["read"],
}


# ── Schemas ───────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.analyst

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, hyphens")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def pw_length(cls, v):
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters")
        return v


class UpdateUserRequest(BaseModel):
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────
@router.post("/register", response_model=LoginResponse)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new account"""
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "This email is already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "This username is already taken")

    # Only admin can create admin/manager accounts via API
    # Self-registration is limited to analyst/viewer roles
    safe_role = req.role
    if req.role in [UserRole.admin, UserRole.manager]:
        safe_role = UserRole.analyst  # Downgrade to analyst for self-registration

    user = User(
        email=req.email,
        username=req.username,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name or req.username.title(),
        role=safe_role,
    )
    db.add(user)

    log = ActivityLog(
        user_id=user.id,
        action="register",
        ip_address=request.client.host if request.client else None,
        details={"email": req.email},
    )
    db.add(log)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return LoginResponse(access_token=token, user=_user_dict(user))


@router.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
):
    """Login with email/username and password"""
    # Allow login with email or username
    user = (
        db.query(User).filter(User.email == form_data.username).first()
        or db.query(User).filter(User.username == form_data.username).first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with that email or username",
        )

    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact an administrator.",
        )

    user.last_login = datetime.utcnow()
    log = ActivityLog(
        user_id=user.id,
        action="login",
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": user.id})
    return LoginResponse(access_token=token, user=_user_dict(user))


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return _user_dict(current_user)


@router.put("/me")
def update_profile(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update own profile"""
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url
    db.commit()
    return {"message": "Profile updated", "user": _user_dict(current_user)}


@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change own password"""
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Admin: User Management ─────────────────────────────────────
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all users — admin only"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(403, "Admin or Manager access required")
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_user_dict(u) for u in users]


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    req: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Update any user — admin only"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot modify your own account here")

    if req.role is not None:
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.full_name is not None:
        user.full_name = req.full_name

    db.commit()
    return {"message": "User updated", "user": _user_dict(user)}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Delete a user — admin only"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    db.delete(user)
    db.commit()
    return {"message": f"User {user.email} deleted"}


@router.post("/admin/create-user")
def admin_create_user(
    req: RegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Admin creates a user with any role"""
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "Username already taken")

    user = User(
        email=req.email,
        username=req.username,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name or req.username.title(),
        role=req.role,  # Admin can set any role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User created", "user": _user_dict(user)}


@router.get("/permissions")
def get_permissions(current_user: User = Depends(get_current_user)):
    """Get current user's permissions"""
    return {
        "role": current_user.role,
        "permissions": ROLE_PERMISSIONS.get(str(current_user.role), ["read"]),
    }


@router.get("/activity-logs")
def get_activity_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get activity logs — admin/manager only"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(403, "Access denied")
    logs = (
        db.query(ActivityLog)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "resource_type": l.resource_type,
            "ip_address": l.ip_address,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


# ── Helper ────────────────────────────────────────────────────
def _user_dict(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role,
        "permissions": ROLE_PERMISSIONS.get(str(user.role), ["read"]),
        "is_active": user.is_active,
        "avatar_url": user.avatar_url,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
