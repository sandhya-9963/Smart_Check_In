from pydantic import BaseModel, EmailStr, Field, PlainSerializer
from typing import List, Optional, Any, Annotated
from datetime import datetime, timezone

UtcDatetime = Annotated[
    datetime,
    PlainSerializer(
        lambda v: v.replace(tzinfo=timezone.utc).isoformat() if v.tzinfo is None else v.isoformat(),
        return_type=str
    )
]

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    full_name: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None


# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str
    # Patient fields
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None
    # Doctor fields
    specialization: Optional[str] = None
    room_number: Optional[str] = None
    department_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserOut(UserBase):
    id: int
    created_at: UtcDatetime

    class Config:
        from_attributes = True


# --- Department Schemas ---
class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int

    class Config:
        from_attributes = True


# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    specialization: str
    room_number: str
    is_available: Optional[bool] = True

class DoctorCreate(DoctorBase):
    user_id: int
    department_id: int

class DoctorOut(BaseModel):
    id: int
    user: UserOut
    department: DepartmentOut
    specialization: str
    room_number: str
    is_available: bool

    class Config:
        from_attributes = True


# --- Patient Schemas ---
class PatientBase(BaseModel):
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None

class PatientCreate(PatientBase):
    user_id: int

class PatientOut(BaseModel):
    id: int
    user: UserOut
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    blood_group: Optional[str] = None

    class Config:
        from_attributes = True

class PatientWalkInCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: str
    date_of_birth: str
    gender: str
    reason: str
    doctor_id: int
    check_in_now: Optional[bool] = True


# --- CheckIn Schemas ---
class CheckInCreate(BaseModel):
    appointment_id: int
    method: str = "QR"  # QR, Manual, Walk-in
    device_info: Optional[str] = None

class CheckInOut(BaseModel):
    id: int
    appointment_id: int
    checkin_time: UtcDatetime
    method: str
    status: str
    device_info: Optional[str] = None

    class Config:
        from_attributes = True


# --- Appointment Schemas ---
class AppointmentBase(BaseModel):
    appointment_time: UtcDatetime
    reason: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    patient_id: int
    doctor_id: int

class AppointmentOut(AppointmentBase):
    id: int
    patient: PatientOut
    doctor: DoctorOut
    status: str  # scheduled, checked_in, in_consultation, completed, cancelled
    queue_number: Optional[int] = None
    token_number: Optional[str] = None
    check_in: Optional[CheckInOut] = None

    class Config:
        from_attributes = True


# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    type: str
    read: bool
    created_at: UtcDatetime

    class Config:
        from_attributes = True


# --- AuditLog Schemas ---
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None  # Helper to display email
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: UtcDatetime

    class Config:
        from_attributes = True


# --- Custom Dashboard Response Schemas ---
class QueueItem(BaseModel):
    appointment_id: int
    token_number: str
    patient_name: str
    doctor_name: str
    department_name: str
    queue_number: int
    status: str
    checkin_time: Optional[UtcDatetime] = None

class WaitingQueueResponse(BaseModel):
    queue: List[QueueItem]
    total_waiting: int
    estimated_wait_minutes: int
    position: Optional[int] = None

class ReceptionDashboardStats(BaseModel):
    total_appointments_today: int
    checked_in_today: int
    waiting_today: int
    in_consultation_today: int
    completed_today: int

class AdminDashboardStats(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_appointments: int
    qr_checkin_rate: float  # Percentage of checkins done via QR code
    active_devices: int     # Count of mock active devices

class PeakHourItem(BaseModel):
    hour: int  # 0-23
    count: int

class DeviceStatusItem(BaseModel):
    device_id: str
    name: str
    status: str  # online, offline
    last_ping: UtcDatetime
