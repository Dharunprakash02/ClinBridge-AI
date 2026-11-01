import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.database import SessionLocal
from backend.app.db.models import User, MappingDecision
from backend.app.core.security import verify_password

client = TestClient(app)

def test_register_clinician_success():
    email = f"clinician_{uuid.uuid4().hex[:8]}@hospital.org"
    payload = {
        "email": email,
        "password": "Password@2026!",
        "full_name": "Dr. Aarav Patel",
        "role": "clinician",
        "organization": "National Institute of Ayurveda"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == email.lower()
    assert data["full_name"] == "Dr. Aarav Patel"
    assert data["role"] == "clinician"
    assert data["organization"] == "National Institute of Ayurveda"
    assert "hashed_password" not in data

def test_register_duplicate_email_rejected():
    email = f"dup_{uuid.uuid4().hex[:8]}@hospital.org"
    payload = {
        "email": email,
        "password": "Password@2026!",
        "full_name": "Dr. Duplicate",
        "role": "clinician"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already registered" in res2.json()["detail"].lower()

def test_register_weak_password_validation():
    payload = {
        "email": f"weak_{uuid.uuid4().hex[:8]}@hospital.org",
        "password": "weak", # No uppercase, numbers, or symbols, <8 chars
        "full_name": "Dr. Weak Password",
        "role": "clinician"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 422

def test_login_success_and_token_generation():
    email = f"login_test_{uuid.uuid4().hex[:8]}@hospital.org"
    password = "SecurePassword@2026!"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Dr. Login Success",
        "role": "clinician"
    })

    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 3600
    assert data["user"]["email"] == email

def test_login_invalid_credentials():
    res = client.post("/api/v1/auth/login", json={"email": "nonexistent@clinbridge.local", "password": "Password@123!"})
    assert res.status_code == 401

def test_get_current_user_profile(auth_headers):
    res = client.get("/api/v1/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "clinician"
    assert "id" in data
    assert "email" in data

def test_unauthenticated_request_rejected():
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert "Bearer" in res.headers.get("WWW-Authenticate", "")

def test_logout_and_revocation():
    email = f"logout_{uuid.uuid4().hex[:8]}@hospital.org"
    password = "LogoutPass@2026!"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Dr. Logout",
        "role": "clinician"
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    access_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Verify access works
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200

    # Logout
    logout_res = client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "success"

    # Subsequent request using same token must be rejected (revoked)
    revoked_me = client.get("/api/v1/auth/me", headers=headers)
    assert revoked_me.status_code == 401
    assert "revoked" in revoked_me.json()["detail"].lower()

def test_refresh_token_rotation():
    email = f"refresh_{uuid.uuid4().hex[:8]}@hospital.org"
    password = "RefreshPass@2026!"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Dr. Refresh",
        "role": "clinician"
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    refresh_token = login_res.json()["refresh_token"]

    # Request new access token using refresh token
    ref_res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_res.status_code == 200
    data = ref_res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["refresh_token"] != refresh_token # Rotated

    # Old refresh token is revoked
    old_ref = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert old_ref.status_code == 401

def test_rbac_clinician_denied_review_override(auth_headers):
    """Clinician attempting administrative review/override must receive 403 Forbidden."""
    payload = {
        "source_term": "Jwara",
        "source_code": "SR11",
        "selected_candidate_code": "MG26",
        "selected_candidate_title": "Fever, unspecified",
        "action": "ACCEPT",
        "comment": "Attempted by clinician without review credentials."
    }
    res = client.post("/api/v1/mapping/review", json=payload, headers=auth_headers)
    assert res.status_code == 403
    assert "insufficient clinical permissions" in res.json()["detail"].lower()

def test_rbac_reviewer_authorized_for_review_override(reviewer_headers):
    """Reviewer role is authorized to perform review endorsements and overrides."""
    payload = {
        "source_term": "Jwara",
        "source_code": "SR11",
        "selected_candidate_code": "MG26",
        "selected_candidate_title": "Fever, unspecified",
        "action": "ACCEPT",
        "comment": "Endorsed by Clinical Review Board.",
        "confidence": 0.95
    }
    res = client.post("/api/v1/mapping/review", json=payload, headers=reviewer_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

def test_rbac_admin_authorized_for_review_override(admin_headers):
    """Admin role has full authority to perform administrative review overrides."""
    payload = {
        "source_term": "vAtavyAdhiH",
        "source_code": "AA",
        "selected_candidate_code": "8E40",
        "selected_candidate_title": "Disorders of the nervous system",
        "action": "MODIFY",
        "comment": "Admin manual override logged.",
        "confidence": 0.90
    }
    res = client.post("/api/v1/mapping/review", json=payload, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

def test_change_password_flow():
    email = f"pwd_change_{uuid.uuid4().hex[:8]}@hospital.org"
    old_pwd = "OldPassword@2026!"
    new_pwd = "NewPassword@2026!#"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": old_pwd,
        "full_name": "Dr. Password Change",
        "role": "clinician"
    })
    login_res = client.post("/api/v1/auth/login", json={"email": email, "password": old_pwd})
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Wrong old password
    bad_res = client.post("/api/v1/auth/change-password", json={
        "old_password": "WrongPassword@123",
        "new_password": new_pwd
    }, headers=headers)
    assert bad_res.status_code == 400

    # Successful password change
    good_res = client.post("/api/v1/auth/change-password", json={
        "old_password": old_pwd,
        "new_password": new_pwd
    }, headers=headers)
    assert good_res.status_code == 200

    # Login with new password succeeds
    login_new = client.post("/api/v1/auth/login", json={"email": email, "password": new_pwd})
    assert login_new.status_code == 200

