import bcrypt


def hash_password(password: str) -> str:
    encoded = password.encode("utf-8")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def verify_password(
    plain_password: str,
    stored_hash: str
) -> bool:
    try:
        encoded = plain_password.encode("utf-8")
        return bcrypt.checkpw(encoded, stored_hash.encode("utf-8"))
    except Exception:
        return False