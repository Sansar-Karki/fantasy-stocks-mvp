from datetime import datetime, timedelta, timezone


def next_saturday_utc(current_time: datetime | None = None) -> datetime:
    now = current_time or datetime.now(timezone.utc)
    # Monday=0 ... Saturday=5
    days_until_saturday = (5 - now.weekday()) % 7
    if days_until_saturday == 0:
        return now
    return now + timedelta(days=days_until_saturday)
