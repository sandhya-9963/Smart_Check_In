from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy import func, desc, and_

from . import models, schemas
from .auth import get_password_hash

# --- User CRUD ---
def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role=user.role,
        full_name=user.full_name,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Department CRUD ---
def get_department_by_code(db: Session, code: str) -> Optional[models.Department]:
    return db.query(models.Department).filter(models.Department.code == code.upper()).first()

def create_department(db: Session, dept: schemas.DepartmentCreate) -> models.Department:
    db_dept = models.Department(
        name=dept.name,
        code=dept.code.upper(),
        description=dept.description
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def get_all_departments(db: Session) -> List[models.Department]:
    return db.query(models.Department).all()

# --- Doctor CRUD ---
def get_doctor_by_user_id(db: Session, user_id: int) -> Optional[models.Doctor]:
    return db.query(models.Doctor).filter(models.Doctor.user_id == user_id).first()

def get_all_doctors(db: Session) -> List[models.Doctor]:
    return db.query(models.Doctor).all()

def create_doctor(db: Session, doctor: schemas.DoctorCreate) -> models.Doctor:
    db_doctor = models.Doctor(
        user_id=doctor.user_id,
        department_id=doctor.department_id,
        specialization=doctor.specialization,
        room_number=doctor.room_number,
        is_available=doctor.is_available
    )
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor

# --- Patient CRUD ---
def get_patient_by_user_id(db: Session, user_id: int) -> Optional[models.Patient]:
    return db.query(models.Patient).filter(models.Patient.user_id == user_id).first()

def get_all_patients(db: Session) -> List[models.Patient]:
    return db.query(models.Patient).all()

def create_patient(db: Session, patient: schemas.PatientCreate) -> models.Patient:
    db_patient = models.Patient(
        user_id=patient.user_id,
        date_of_birth=patient.date_of_birth,
        gender=patient.gender,
        phone=patient.phone,
        emergency_contact=patient.emergency_contact,
        blood_group=patient.blood_group
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

# --- Appointment CRUD ---
def get_appointment_by_id(db: Session, appt_id: int) -> Optional[models.Appointment]:
    return db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()

def get_appointments_for_patient(db: Session, patient_id: int) -> List[models.Appointment]:
    return db.query(models.Appointment).filter(models.Appointment.patient_id == patient_id).order_by(desc(models.Appointment.appointment_time)).all()

def create_appointment(db: Session, appt: schemas.AppointmentCreate) -> models.Appointment:
    # Generate token number
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    count = db.query(models.Appointment).filter(
        and_(
            models.Appointment.appointment_time >= today_start,
            models.Appointment.appointment_time <= today_end
        )
    ).count() + 1
    
    token = f"TKN-{str(count).zfill(3)}"
    
    db_appt = models.Appointment(
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        appointment_time=appt.appointment_time,
        status="scheduled",
        token_number=token,
        reason=appt.reason
    )
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt

def get_today_appointments(db: Session) -> List[models.Appointment]:
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    return db.query(models.Appointment).filter(
        and_(
            models.Appointment.appointment_time >= today_start,
            models.Appointment.appointment_time <= today_end
        )
    ).all()

# --- CheckIn & Queue Management ---
def create_checkin(db: Session, checkin_data: schemas.CheckInCreate, method: str = "QR", status: str = "verified") -> models.CheckIn:
    # Fetch appointment
    appt = db.query(models.Appointment).filter(models.Appointment.id == checkin_data.appointment_id).first()
    if not appt:
        raise ValueError("Appointment not found")
        
    # Check if duplicate (already checked in)
    existing_checkin = db.query(models.CheckIn).filter(
        and_(
            models.CheckIn.appointment_id == appt.id,
            models.CheckIn.status == "verified"
        )
    ).first()
    
    if existing_checkin:
        # Create a duplicate status check-in log
        db_checkin = models.CheckIn(
            appointment_id=checkin_data.appointment_id,
            method=method,
            status="duplicate",
            device_info=checkin_data.device_info
        )
        db.add(db_checkin)
        db.commit()
        db.refresh(db_checkin)
        return db_checkin

    # Assign queue number for that doctor on that day
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    max_queue = db.query(func.max(models.Appointment.queue_number)).join(models.CheckIn).filter(
        and_(
            models.Appointment.doctor_id == appt.doctor_id,
            models.CheckIn.checkin_time >= today_start,
            models.CheckIn.checkin_time <= today_end,
            models.CheckIn.status == "verified"
        )
    ).scalar()
    
    next_queue = (max_queue or 0) + 1
    
    # Update appointment
    appt.status = "checked_in"
    appt.queue_number = next_queue
    
    db_checkin = models.CheckIn(
        appointment_id=checkin_data.appointment_id,
        method=method,
        status="verified",
        device_info=checkin_data.device_info
    )
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)
    return db_checkin

def update_appointment_status(db: Session, appt_id: int, status_str: str) -> Optional[models.Appointment]:
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if appt:
        appt.status = status_str
        db.commit()
        db.refresh(appt)
    return appt

def register_walk_in_patient(db: Session, data: schemas.PatientWalkInCreate) -> models.Appointment:
    # 1. Check if user already exists
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        # Create User
        user = models.User(
            email=data.email,
            hashed_password=get_password_hash("SportingEthos2026!"),  # default temp password
            role="patient",
            full_name=data.full_name,
            is_active=True
        )
        db.add(user)
        db.flush()
        
    # 2. Check if patient profile exists
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient:
        patient = models.Patient(
            user_id=user.id,
            date_of_birth=data.date_of_birth,
            gender=data.gender,
            phone=data.phone
        )
        db.add(patient)
        db.flush()
        
    # 3. Create Appointment (scheduled for now)
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    count = db.query(models.Appointment).filter(
        and_(
            models.Appointment.appointment_time >= today_start,
            models.Appointment.appointment_time <= today_end
        )
    ).count() + 1
    token = f"TKN-{str(count).zfill(3)}"
    
    appt = models.Appointment(
        patient_id=patient.id,
        doctor_id=data.doctor_id,
        appointment_time=datetime.utcnow(),
        status="scheduled",
        token_number=token,
        reason=data.reason
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    
    return appt

# --- Queue Calculations ---
def get_waiting_queue_for_doctor(db: Session, doctor_id: int) -> List[models.Appointment]:
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    return db.query(models.Appointment).join(models.CheckIn).filter(
        and_(
            models.Appointment.doctor_id == doctor_id,
            models.Appointment.status.in_(["checked_in", "in_consultation"]),
            models.CheckIn.checkin_time >= today_start,
            models.CheckIn.checkin_time <= today_end,
            models.CheckIn.status == "verified"
        )
    ).order_by(models.Appointment.queue_number).all()

def calculate_patient_wait_stats(db: Session, appt_id: int) -> dict:
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt or appt.status not in ["checked_in", "in_consultation"]:
        return {"position": 0, "estimated_wait_minutes": 0}
        
    if appt.status == "in_consultation":
        return {"position": 0, "estimated_wait_minutes": 5} # about to finish
        
    # Find all patients in queue ahead of this one for the same doctor
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    ahead_count = db.query(models.Appointment).join(models.CheckIn).filter(
        and_(
            models.Appointment.doctor_id == appt.doctor_id,
            models.Appointment.status == "checked_in",
            models.Appointment.queue_number < appt.queue_number,
            models.CheckIn.checkin_time >= today_start,
            models.CheckIn.checkin_time <= today_end,
            models.CheckIn.status == "verified"
        )
    ).count()
    
    # Check if there is currently a patient in consultation for this doctor
    has_active_consultation = db.query(models.Appointment).filter(
        and_(
            models.Appointment.doctor_id == appt.doctor_id,
            models.Appointment.status == "in_consultation"
        )
    ).first()
    
    # Average consultation time is 15 mins
    wait_time = (ahead_count * 15) + (15 if has_active_consultation else 0)
    
    return {
        "position": ahead_count + 1,
        "estimated_wait_minutes": max(0, wait_time)
    }

# --- Notifications ---
def create_notification(db: Session, user_id: int, message: str, type_str: str = "info") -> models.Notification:
    notif = models.Notification(
        user_id=user_id,
        message=message,
        type=type_str,
        read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def get_unread_notifications(db: Session, user_id: int) -> List[models.Notification]:
    return db.query(models.Notification).filter(
        and_(
            models.Notification.user_id == user_id,
            models.Notification.read == False
        )
    ).order_by(desc(models.Notification.created_at)).all()

# --- Audit Logs ---
def create_audit_log(db: Session, user_id: Optional[int], action: str, details: str, ip_address: Optional[str] = None) -> models.AuditLog:
    log = models.AuditLog(
        user_id=user_id,
        action=action,
        details=details,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
