from functools import lru_cache

from supabase import Client, create_client

from config import settings


class SupabaseConfigError(RuntimeError):
    pass


def _validate_supabase_settings() -> None:
    missing = []
    if not settings.SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not settings.SUPABASE_KEY:
        missing.append("SUPABASE_KEY")

    if missing:
        variables = ", ".join(missing)
        raise SupabaseConfigError(
            f"Missing required Supabase environment variable(s): {variables}"
        )


def has_supabase_service_role_key() -> bool:
    return bool(settings.SUPABASE_SERVICE_ROLE_KEY)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    _validate_supabase_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Client:
    _validate_supabase_settings()
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, key)


def verify_supabase_connection() -> bool:
    _validate_supabase_settings()
    get_supabase_client()
    return True
