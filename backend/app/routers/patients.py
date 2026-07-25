from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import schemas, models, crud, auth
from ..websocket import manager

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/", response_model=List[schemas.PatientOut])
def get_all_patients_list(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin", "receptionist"]))
):
    return crud.get_all_patients(db)

@router.get("/queue/{appointment_id}", response_model=schemas.WaitingQueueResponse)
def get_queue_status(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Verify appointment exists
    appt = crud.get_appointment_by_id(db, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    # Get doctor queue
    doctor_queue = crud.get_waiting_queue_for_doctor(db, appt.doctor_id)
    
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
        
    stats = crud.calculate_patient_wait_stats(db, appointment_id)
    
    return schemas.WaitingQueueResponse(
        queue=queue_list,
        total_waiting=len(queue_list),
        estimated_wait_minutes=stats["estimated_wait_minutes"],
        position=stats["position"]
    )

@router.post("/walk-in", response_model=schemas.AppointmentOut)
async def register_walk_in(
    data: schemas.PatientWalkInCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.RoleChecker(["admin", "receptionist"]))
):
    # 1. Register walk in patient & create appointment
    appt = crud.register_walk_in_patient(db, data)
    
    if data.check_in_now:
        # 2. Automatically check them in since it is a walk-in
        checkin_req = schemas.CheckInCreate(
            appointment_id=appt.id,
            method="Walk-in"
        )
        
        db_checkin = crud.create_checkin(db, checkin_req, method="Walk-in")
        
        # Calculate queue statistics
        wait_stats = crud.calculate_patient_wait_stats(db, appt.id)
        
        # Notify doctor
        doctor_user_id = appt.doctor.user_id
        msg_doctor = f"Walk-in Patient {appt.patient.user.full_name} has checked in and is waiting in queue."
        crud.create_notification(db, user_id=doctor_user_id, message=msg_doctor, type_str="info")
        
        # Broadcast WS
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
        
        # Broadcast to Doctor, Receptionists, Admin
        await manager.send_personal_message(ws_payload, user_id=doctor_user_id)
        await manager.broadcast_to_role(ws_payload, role="receptionist")
        await manager.broadcast_to_role(ws_payload, role="admin")
        
        # Log audit
        crud.create_audit_log(
            db, 
            user_id=current_user.id, 
            action="walk_in_registration", 
            details=f"Registered walk-in Patient {data.full_name} with Doctor ID {data.doctor_id} and checked in immediately"
        )
    else:
        # Just register the appointment, keeping status as 'scheduled'
        ws_payload = {
            "event": "appointment_booked",
            "data": {
                "appointment_id": appt.id,
                "token_number": appt.token_number,
                "patient_name": appt.patient.user.full_name,
                "doctor_name": appt.doctor.user.full_name,
                "status": appt.status
            }
        }
        await manager.broadcast_to_role(ws_payload, role="receptionist")
        await manager.broadcast_to_role(ws_payload, role="admin")
        
        # Log audit
        crud.create_audit_log(
            db, 
            user_id=current_user.id, 
            action="walk_in_registration", 
            details=f"Registered walk-in Patient {data.full_name} with Doctor ID {data.doctor_id} (Scheduled only)"
        )
        
    return appt
