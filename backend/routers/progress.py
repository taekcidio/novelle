from fastapi import APIRouter
from fastapi.responses import JSONResponse

from database.supabase_client import SupabaseConfigError, get_supabase_admin_client
from schemas import ProgressCreate
from services.user_ids import normalize_user_id

router = APIRouter()


def _ensure_user(user_id: str) -> None:
    get_supabase_admin_client().table("users").upsert(
        {
            "id": user_id,
            "name": "Lector invitado",
            "username": f"guest-{user_id[:8]}",
            "email": f"guest-{user_id[:8]}@novelle.local",
        },
        on_conflict="id",
    ).execute()


@router.post("/")
async def save_progress(data: ProgressCreate):
    """Save user reading progress in Supabase."""
    user_id = normalize_user_id(data.user_id)
    payload = {
        "user_id": user_id,
        "story_id": data.story_id,
        "current_scene": data.current_scene or None,
        "decisions_path": data.decisions or [],
        "completed": data.completed,
    }

    try:
        _ensure_user(user_id)
        response = (
            get_supabase_admin_client()
            .table("user_progress")
            .upsert(payload, on_conflict="user_id,story_id")
            .execute()
        )
    except SupabaseConfigError:
        return JSONResponse(
            status_code=202,
            content={
                "status": "local_fallback",
                "detail": (
                    "Progress could not be synced with Supabase right now. "
                    "The frontend should keep the localStorage copy."
                ),
                "data": payload,
            },
        )
    except Exception:
        return JSONResponse(
            status_code=202,
            content={
                "status": "local_fallback",
                "detail": (
                    "Progress could not be synced with Supabase right now. "
                    "The frontend should keep the localStorage copy."
                ),
                "data": payload,
            },
        )

    return {"status": "saved", "data": response.data[0] if response.data else payload}


@router.get("/{user_id}")
async def get_progress(user_id: str):
    """Get all Supabase progress for a user."""
    safe_user_id = normalize_user_id(user_id)
    try:
        response = (
            get_supabase_admin_client()
            .table("user_progress")
            .select("*")
            .eq("user_id", safe_user_id)
            .execute()
        )
    except SupabaseConfigError:
        return []
    except Exception:
        return []

    return response.data or []
