from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from .. import schemas, models, crud, auth
from ..websocket import manager

router = APIRouter(prefix="/appointments", tags=["appointments"])

@router.post("/", response_model=schemas.AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_new_appointment(
    appt: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin", "receptionist", "patient"]))
):
    # Verify patient exists
    if current_user.role == "patient":
        patient = crud.get_patient_by_user_id(db, current_user.id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        appt.patient_id = patient.id
    else:
        patient = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    
    # Verify doctor exists
    doctor = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    db_appt = crud.create_appointment(db, appt)
    crud.create_audit_log(
        db, 
        user_id=current_user.id, 
        action="create_appointment", 
        details=f"Appointment ID {db_appt.id} created for Patient {patient.user.full_name} with Doctor {doctor.user.full_name}"
    )
    return db_appt

@router.get("/", response_model=List[schemas.AppointmentOut])
def get_appointments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.role == "patient":
        patient = crud.get_patient_by_user_id(db, current_user.id)
        if not patient:
            return []
        return crud.get_appointments_for_patient(db, patient.id)
        
    elif current_user.role == "doctor":
        doctor = crud.get_doctor_by_user_id(db, current_user.id)
        if not doctor:
            return []
        return db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id).all()
        
    # Admin and receptionists get all
    return db.query(models.Appointment).all()

@router.get("/today", response_model=List[schemas.AppointmentOut])
def get_today_appointments_list(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin", "receptionist"]))
):
    return crud.get_today_appointments(db)

@router.post("/check-in", response_model=schemas.CheckInOut)
async def check_in_patient(
    checkin_data: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify appointment exists
    appt = crud.get_appointment_by_id(db, checkin_data.appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Execute checkin
    try:
        db_checkin = crud.create_checkin(
            db=db, 
            checkin_data=checkin_data, 
            method=checkin_data.method,
            status="verified"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    patient_user_id = appt.patient.user_id
    doctor_user_id = appt.doctor.user_id
    
    # Audit log
    crud.create_audit_log(
        db, 
        user_id=current_user.id, 
        action="check_in", 
        details=f"Appointment {appt.id} checked in via {checkin_data.method}. Status: {db_checkin.status}"
    )

    # Calculate queue statistics
    wait_stats = crud.calculate_patient_wait_stats(db, appt.id)

    if db_checkin.status == "verified":
        # Create db notification for patient
        msg_patient = f"Check-in verified! Token: {appt.token_number}. Queue position: {wait_stats['position']}. Est. wait: {wait_stats['estimated_wait_minutes']} mins."
        crud.create_notification(db, user_id=patient_user_id, message=msg_patient, type_str="success")
        
        # Create db notification for doctor
        msg_doctor = f"Patient {appt.patient.user.full_name} has checked in and is waiting in queue."
        crud.create_notification(db, user_id=doctor_user_id, message=msg_doctor, type_str="info")

        # Broadcast WebSockets
        ws_payload = {
            "event": "patient_checked_in",
            "data": {
                "appointment_id": appt.id,
                "token_number": appt.token_number,
                "patient_name": appt.patient.user.full_name,
                "doctor_name": appt.doctor.user.full_name,
                "department_name": appt.doctor.department.name,
                "queue_number": appt.queue_number,
                "status": appt.status,
                "checkin_time": db_checkin.checkin_time.isoformat(),
                "position": wait_stats['position'],
                "estimated_wait_minutes": wait_stats['estimated_wait_minutes']
            }
        }
        
        # Notify Doctor
        await manager.send_personal_message(ws_payload, user_id=doctor_user_id)
        # Notify Patient
        await manager.send_personal_message(ws_payload, user_id=patient_user_id)
        # Notify Receptionists
        await manager.broadcast_to_role(ws_payload, role="receptionist")
        # Notify Admins
        await manager.broadcast_to_role(ws_payload, role="admin")
        
    else:  # duplicate checkin
        ws_payload = {
            "event": "duplicate_checkin_detected",
            "data": {
                "appointment_id": appt.id,
                "patient_name": appt.patient.user.full_name,
                "doctor_name": appt.doctor.user.full_name,
                "token_number": appt.token_number
            }
        }
        # Notify Receptionists and Admin
        await manager.broadcast_to_role(ws_payload, role="receptionist")
        await manager.broadcast_to_role(ws_payload, role="admin")
        
    return db_checkin
