from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy import func, desc, and_

from ..database import get_db
from .. import schemas, models, crud, auth

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats", response_model=schemas.AdminDashboardStats)
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    total_users = db.query(models.User).count()
    total_patients = db.query(models.Patient).count()
    total_doctors = db.query(models.Doctor).count()
    total_appointments = db.query(models.Appointment).count()
    
    # QR check-in rate
    total_checkins = db.query(models.CheckIn).filter(models.CheckIn.status == "verified").count()
    qr_checkins = db.query(models.CheckIn).filter(
        and_(
            models.CheckIn.method == "QR",
            models.CheckIn.status == "verified"
        )
    ).count()
    
    qr_rate = (qr_checkins / total_checkins * 100) if total_checkins > 0 else 100.0
    
    return schemas.AdminDashboardStats(
        total_users=total_users,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_appointments=total_appointments,
        qr_checkin_rate=round(qr_rate, 2),
        active_devices=3 # Hardcoded mock active devices
    )

@router.get("/peak-hours", response_model=List[schemas.PeakHourItem])
def get_peak_hours(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    # Fetch all checkins from the last 30 days to have a good distribution
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    checkins = db.query(models.CheckIn.checkin_time).filter(
        and_(
            models.CheckIn.checkin_time >= thirty_days_ago,
            models.CheckIn.status == "verified"
        )
    ).all()
    
    # Initialize hour buckets
    hour_buckets = {h: 0 for h in range(8, 20)} # standard operational clinic hours: 8 AM to 8 PM
    
    for c in checkins:
        h = c.checkin_time.hour
        if h in hour_buckets:
            hour_buckets[h] += 1
            
    return [schemas.PeakHourItem(hour=h, count=count) for h, count in hour_buckets.items()]

@router.get("/devices", response_model=List[schemas.DeviceStatusItem])
def get_devices(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    # Return mock device monitoring data
    now = datetime.utcnow()
    return [
        schemas.DeviceStatusItem(
            device_id="KIOSK-01",
            name="Main Lobby QR Kiosk",
            status="online",
            last_ping=now - timedelta(seconds=12)
        ),
        schemas.DeviceStatusItem(
            device_id="TABLET-02",
            name="Reception Check-in Pad",
            status="online",
            last_ping=now - timedelta(seconds=45)
        ),
        schemas.DeviceStatusItem(
            device_id="SCANNER-03",
            name="Physio Entrance scanner",
            status="offline",
            last_ping=now - timedelta(hours=3, minutes=12)
        )
    ]

@router.get("/audit-logs", response_model=List[schemas.AuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    logs = db.query(models.AuditLog).order_by(desc(models.AuditLog.created_at)).limit(100).all()
    
    # Attach email to the log objects before returning
    res = []
    for log in logs:
        user_email = log.user.email if log.user else "System"
        res.append(
            schemas.AuditLogOut(
                id=log.id,
                user_id=log.user_id,
                user_email=user_email,
                action=log.action,
                details=log.details,
                ip_address=log.ip_address,
                created_at=log.created_at
            )
        )
    return res

@router.get("/users", response_model=List[schemas.UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    return db.query(models.User).all()

@router.post("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin"]))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = not user.is_active
    db.commit()
    
    crud.create_audit_log(
        db,
        user_id=current_user.id,
        action="user_toggle_active",
        details=f"Toggled User {user.email} active status to {user.is_active}"
    )
    
    return {"message": f"User active status set to {user.is_active}"}
