from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def is_lineup_edit_window(current_time: datetime | None = None) -> bool:
    dt = current_time or now_utc()
    # Saturday=5, Sunday=6
    return dt.weekday() in (5, 6)
