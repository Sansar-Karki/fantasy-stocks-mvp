import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(key).decode()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt_b64, key_b64 = hashed_password.split("$", maxsplit=1)
        salt = base64.b64decode(salt_b64.encode())
        expected_key = base64.b64decode(key_b64.encode())
    except (ValueError, TypeError):
        return False

    candidate_key = hashlib.scrypt(
        plain_password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64
    )
    return hmac.compare_digest(candidate_key, expected_key)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
