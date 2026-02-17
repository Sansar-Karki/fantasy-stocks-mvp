import secrets


ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_invite_code(length: int = 8) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
