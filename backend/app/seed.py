from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from . import models, auth

def seed_db(db: Session):
    # Check if database is already seeded
    if db.query(models.User).first() is not None:
        print("Database already contains data, skipping seed.")
        return

    print("Seeding database with sample hackathon data...")

    # 1. Create Departments
    physio = models.Department(
        name="Physiotherapy & Rehab",
        code="PHY",
        description="High-performance physical rehabilitation and conditioning."
    )
    cardio = models.Department(
        name="Sports Cardiology",
        code="CAR",
        description="Cardiovascular evaluations for elite athletes."
    )
    sports_med = models.Department(
        name="Sports Medicine",
        code="MED",
        description="Non-surgical orthopedic injuries and treatments."
    )
    db.add_all([physio, cardio, sports_med])
    db.flush() # assign IDs

    # 2. Create Users (hashed passwords)
    pw = auth.get_password_hash("SportingEthos2026!")

    u_admin = models.User(email="admin@sportingethos.com", hashed_password=pw, role="admin", full_name="Admin Manager")
    u_reception = models.User(email="reception@sportingethos.com", hashed_password=pw, role="receptionist", full_name="Sarah Connors")
    u_doc1 = models.User(email="doctor@sportingethos.com", hashed_password=pw, role="doctor", full_name="Dr. Robert Chen")
    u_doc2 = models.User(email="jenkins@sportingethos.com", hashed_password=pw, role="doctor", full_name="Dr. Sarah Jenkins")
    
    u_pat1 = models.User(email="patient@sportingethos.com", hashed_password=pw, role="patient", full_name="John Doe")
    u_pat2 = models.User(email="jane@sportingethos.com", hashed_password=pw, role="patient", full_name="Jane Smith")
    u_pat3 = models.User(email="alice@sportingethos.com", hashed_password=pw, role="patient", full_name="Alice Cooper")

    db.add_all([u_admin, u_reception, u_doc1, u_doc2, u_pat1, u_pat2, u_pat3])
    db.flush()

    # 3. Create Doctors
    doc1 = models.Doctor(user_id=u_doc1.id, department_id=physio.id, specialization="Sports Physiotherapy", room_number="Room 101", is_available=True)
    doc2 = models.Doctor(user_id=u_doc2.id, department_id=cardio.id, specialization="Cardiovascular Rehab", room_number="Room 102", is_available=True)
    db.add_all([doc1, doc2])
    
    # 4. Create Patients
    pat1 = models.Patient(user_id=u_pat1.id, date_of_birth="1990-05-15", gender="Male", phone="+91 98765 43210", emergency_contact="Mary Doe", blood_group="O+")
    pat2 = models.Patient(user_id=u_pat2.id, date_of_birth="1985-08-22", gender="Female", phone="+91 99999 88888", emergency_contact="David Smith", blood_group="A+")
    pat3 = models.Patient(user_id=u_pat3.id, date_of_birth="1993-01-30", gender="Female", phone="+91 88888 77777", emergency_contact="Charlie Cooper", blood_group="B+")
    db.add_all([pat1, pat2, pat3])
    db.flush()

    # 5. Create Appointments for Today
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day, 9, 0) # 9:00 AM today
    
    # Appt 1: Completed earlier
    appt_completed = models.Appointment(
        patient_id=pat3.id,
        doctor_id=doc1.id,
        appointment_time=today_start - timedelta(hours=2),
        status="completed",
        token_number="TKN-001",
        reason="Knee assessment review"
    )
    # Check-in for Appt 1
    checkin_completed = models.CheckIn(
        appointment=appt_completed,
        checkin_time=today_start - timedelta(hours=2, minutes=10),
        method="QR",
        status="verified",
        device_info="Lobby Kiosk"
    )
    
    # Appt 2: Checked In & Waiting
    appt_waiting = models.Appointment(
        patient_id=pat2.id,
        doctor_id=doc1.id,
        appointment_time=today_start,
        status="checked_in",
        token_number="TKN-002",
        queue_number=1,
        reason="Post-op recovery plan"
    )
    # Check-in for Appt 2
    checkin_waiting = models.CheckIn(
        appointment=appt_waiting,
        checkin_time=today_start - timedelta(minutes=5),
        method="QR",
        status="verified",
        device_info="Lobby Kiosk"
    )

    # Appt 3: Scheduled (NOT Checked in yet - John Doe)
    # This allows the patient to log in and check in via their portal
    appt_scheduled = models.Appointment(
        patient_id=pat1.id,
        doctor_id=doc1.id,
        appointment_time=today_start + timedelta(hours=1),
        status="scheduled",
        token_number="TKN-003",
        reason="Hamstring strengthening evaluation"
    )

    db.add_all([appt_completed, appt_waiting, appt_scheduled])
    db.flush()
    db.add_all([checkin_completed, checkin_waiting])
    db.flush()

    # 6. Create notifications
    notif1 = models.Notification(
        user_id=u_doc1.id,
        message="Patient Jane Smith has checked in and is waiting in queue.",
        type="info",
        read=False
    )
    notif2 = models.Notification(
        user_id=u_pat2.id,
        message="Check-in verified! Token: TKN-002. Queue position: #1. Est. wait: 15 mins.",
        type="success",
        read=False
    )
    db.add_all([notif1, notif2])

    # 7. Create Audit Logs
    audit1 = models.AuditLog(user_id=u_admin.id, action="db_seed", details="Initial database seed executed.")
    audit2 = models.AuditLog(user_id=u_pat2.id, action="check_in", details="Jane Smith checked in via QR scanner KIOSK-01.")
    db.add_all([audit1, audit2])

    db.commit()
    print("Database seeding completed successfully!")
