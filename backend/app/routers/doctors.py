from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date, timedelta
from sqlalchemy import and_

from ..database import get_db
from .. import schemas, models, crud, auth
from ..websocket import manager

router = APIRouter(prefix="/doctors", tags=["doctors"])

@router.get("/", response_model=List[schemas.DoctorOut])
def get_doctors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_all_doctors(db)

@router.get("/queue", response_model=schemas.WaitingQueueResponse)
def get_doctor_queue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["doctor"]))
):
    doctor = crud.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    doctor_queue = crud.get_waiting_queue_for_doctor(db, doctor.id)
    
    # Format queue list
    queue_list = []
    for item in doctor_queue:
        checkin_time = item.check_in.checkin_time if item.check_in else None
        queue_list.append(
            schemas.QueueItem(
                appointment_id=item.id,
                token_number=item.token_number or "",
                patient_name=item.patient.user.full_name,
                doctor_name=item.doctor.user.full_name,
                department_name=item.doctor.department.name,
                queue_number=item.queue_number or 0,
                status=item.status,
                checkin_time=checkin_time
            )
        )
        
    # Estimated wait calculation: total number of waiting patients * 15
    waiting_count = sum(1 for item in queue_list if item.status == "checked_in")
    est_wait = waiting_count * 15
    
    return schemas.WaitingQueueResponse(
        queue=queue_list,
        total_waiting=len(queue_list),
        estimated_wait_minutes=est_wait
    )

@router.post("/status/{appointment_id}")
async def update_patient_status(
    appointment_id: int,
    status_str: str,  # in_consultation, completed, cancelled
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["doctor", "receptionist", "admin"]))
):
    if status_str not in ["in_consultation", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status transition")
        
    appt = crud.get_appointment_by_id(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Update status
    updated_appt = crud.update_appointment_status(db, appointment_id, status_str)
    
    # Audit log
    crud.create_audit_log(
        db, 
        user_id=current_user.id, 
        action="status_change", 
        details=f"Updated Appointment {appointment_id} status to {status_str}"
    )
    
    # Create notification for patient
    patient_user_id = appt.patient.user_id
    if status_str == "in_consultation":
        msg = "It's your turn! Please proceed to the doctor's room."
        crud.create_notification(db, user_id=patient_user_id, message=msg, type_str="info")
    elif status_str == "completed":
        msg = "Your consultation is complete. Thank you for visiting Sporting Ethos!"
        crud.create_notification(db, user_id=patient_user_id, message=msg, type_str="success")
    else:
        msg = f"Your appointment status has been updated to {status_str}."
        crud.create_notification(db, user_id=patient_user_id, message=msg, type_str="warning")
        
    # Broadcast status change to clients via WebSocket
    ws_payload = {
        "event": "appointment_status_changed",
        "data": {
            "appointment_id": appointment_id,
            "status": status_str,
            "patient_name": appt.patient.user.full_name,
            "token_number": appt.token_number,
            "doctor_id": appt.doctor_id,
            "doctor_name": appt.doctor.user.full_name
        }
    }
    
    await manager.send_personal_message(ws_payload, user_id=patient_user_id)
    await manager.broadcast_to_role(ws_payload, role="receptionist")
    await manager.broadcast_to_role(ws_payload, role="admin")
    await manager.send_personal_message(ws_payload, user_id=appt.doctor.user_id)
    
    return {"message": f"Appointment status updated to {status_str}"}

@router.post("/delay")
async def declare_delay(
    delay_minutes: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["doctor"]))
):
    doctor = crud.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    # Update doctor status or log the delay (let's keep the delay logged as a notification and websocket broadcast)
    # Broadcast to all patients of this doctor that there is a delay
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = datetime.combine(date.today(), datetime.max.time())
    
    # Get patients checked in for this doctor today
    active_appointments = db.query(models.Appointment).filter(
        and_(
            models.Appointment.doctor_id == doctor.id,
            models.Appointment.status == "checked_in",
            models.Appointment.appointment_time >= today_start,
            models.Appointment.appointment_time <= today_end
        )
    ).all()
    
    msg = f"Dr. {current_user.full_name} is running approximately {delay_minutes} minutes behind schedule."
    
    # Save notifications and send ws
    for appt in active_appointments:
        patient_user_id = appt.patient.user_id
        crud.create_notification(db, user_id=patient_user_id, message=msg, type_str="warning")
        
        # Calculate new estimates
        wait_stats = crud.calculate_patient_wait_stats(db, appt.id)
        adjusted_wait = wait_stats["estimated_wait_minutes"] + delay_minutes
        
        ws_payload = {
            "event": "doctor_delay_alert",
            "data": {
                "doctor_name": current_user.full_name,
                "delay_minutes": delay_minutes,
                "message": msg,
                "appointment_id": appt.id,
                "adjusted_wait_minutes": adjusted_wait
            }
        }
        await manager.send_personal_message(ws_payload, user_id=patient_user_id)
        
    # Broadcast to reception and admin dashboards too
    ws_reception = {
        "event": "doctor_delay_alert",
        "data": {
            "doctor_id": doctor.id,
            "doctor_name": current_user.full_name,
            "delay_minutes": delay_minutes,
            "message": msg
        }
    }
    await manager.broadcast_to_role(ws_reception, role="receptionist")
    await manager.broadcast_to_role(ws_reception, role="admin")
    
    crud.create_audit_log(
        db, 
        user_id=current_user.id, 
        action="doctor_delay", 
        details=f"Doctor declared a delay of {delay_minutes} minutes. Message broadcasted to patients."
    )
    
    return {"message": f"Delay of {delay_minutes} minutes announced."}
