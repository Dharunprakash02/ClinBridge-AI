import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.database import SessionLocal, Base, engine
import backend.app.db.models as db_models
from backend.app.core.security import get_password_hash, create_access_token

@pytest.fixture(scope="session", autouse=True)
def init_test_database():
    """Ensure all database tables exist before running test suite."""
    Base.metadata.create_all(bind=engine)

@pytest.fixture
def db_session():
    """Provides a transactional database session for tests."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_clinician(db_session):
    """Provides an authenticated clinician user."""
    email = "test_clinician@clinbridge.local"
    user = db_session.query(db_models.User).filter(db_models.User.email == email).first()
    if not user:
        user = db_models.User(
            email=email,
            hashed_password=get_password_hash("Clinician@2026!"),
            full_name="Dr. Test Clinician",
            role="clinician",
            organization="ClinBridge Clinical Center",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def test_reviewer(db_session):
    """Provides an authenticated reviewer user."""
    email = "test_reviewer@clinbridge.local"
    user = db_session.query(db_models.User).filter(db_models.User.email == email).first()
    if not user:
        user = db_models.User(
            email=email,
            hashed_password=get_password_hash("Reviewer@2026!"),
            full_name="Dr. Test Reviewer",
            role="reviewer",
            organization="ClinBridge Audit Board",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def test_admin(db_session):
    """Provides an authenticated administrative user."""
    email = "admin@clinbridge.local"
    user = db_session.query(db_models.User).filter(db_models.User.email == email).first()
    if not user:
        user = db_models.User(
            email=email,
            hashed_password=get_password_hash("Admin@ClinBridge2026!"),
            full_name="ClinBridge System Administrator",
            role="admin",
            organization="ClinBridge AI Central Admin",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_clinician):
    """Bearer authorization headers for standard clinician role."""
    token, _, _ = create_access_token(
        user_id=test_clinician.id,
        email=test_clinician.email,
        role=test_clinician.role,
        full_name=test_clinician.full_name
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def reviewer_headers(test_reviewer):
    """Bearer authorization headers for reviewer role."""
    token, _, _ = create_access_token(
        user_id=test_reviewer.id,
        email=test_reviewer.email,
        role=test_reviewer.role,
        full_name=test_reviewer.full_name
    )
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers(test_admin):
    """Bearer authorization headers for administrator role."""
    token, _, _ = create_access_token(
        user_id=test_admin.id,
        email=test_admin.email,
        role=test_admin.role,
        full_name=test_admin.full_name
    )
    return {"Authorization": f"Bearer {token}"}

