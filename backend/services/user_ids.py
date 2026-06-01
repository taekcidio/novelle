from uuid import NAMESPACE_DNS, UUID, uuid5


GUEST_USER_ID = "00000000-0000-0000-0000-000000000001"


def is_guest_user_id(user_id: str | None) -> bool:
    return not user_id or str(user_id).strip().lower() == "guest"


def normalize_user_id(user_id: str | None) -> str:
    """Return a UUID-safe user id for Supabase UUID columns."""
    if is_guest_user_id(user_id):
        return GUEST_USER_ID

    raw_user_id = str(user_id).strip()
    try:
        UUID(raw_user_id)
        return raw_user_id
    except (TypeError, ValueError):
        return str(uuid5(NAMESPACE_DNS, f"firebase:{raw_user_id}"))
