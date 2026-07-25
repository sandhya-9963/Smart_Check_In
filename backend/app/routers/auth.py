from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import List

from ..database import get_db
from .. import schemas, models, crud, auth

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.get("/departments", response_model=List[schemas.DepartmentOut])
def get_departments(db: Session = Depends(get_db)):
    return crud.get_all_departments(db)

@router.post("/signup", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    
    # Validate role
    if user_in.role not in ["patient", "doctor"]:
        raise HTTPException(
            status_code=400,
            detail="Signup is only supported for patients and doctors."
        )
    
    # Create the user
    new_user = crud.create_user(db, user_in)
    
    # If patient, automatically create patient record
    if new_user.role == "patient":
        patient_create = schemas.PatientCreate(
            user_id=new_user.id,
            date_of_birth=user_in.date_of_birth,
            gender=user_in.gender,
            phone=user_in.phone,
            emergency_contact=user_in.emergency_contact,
            blood_group=user_in.blood_group
        )
        crud.create_patient(db, patient_create)
        
    # If doctor, automatically create doctor record
    elif new_user.role == "doctor":
        if not user_in.department_id or not user_in.specialization or not user_in.room_number:
            raise HTTPException(
                status_code=400,
                detail="Doctor registration requires department_id, specialization, and room_number."
            )
        doctor_create = schemas.DoctorCreate(
            user_id=new_user.id,
            department_id=user_in.department_id,
            specialization=user_in.specialization,
            room_number=user_in.room_number,
            is_available=True
        )
        crud.create_doctor(db, doctor_create)
        
    crud.create_audit_log(db, user_id=new_user.id, action="signup", details=f"User signed up with role: {new_user.role}")
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    # Standard JSON body login for easy fetch client integration
    user = crud.get_user_by_email(db, email=login_data.email)
    if not user or not auth.verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role, "user_id": user.id}
    )
    
    # Audit log
    crud.create_audit_log(db, user_id=user.id, action="login", details="User logged in successfully")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "full_name": user.full_name
    }

@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
