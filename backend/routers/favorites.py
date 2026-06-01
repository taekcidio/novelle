# NOVELLE - Favorites Router
from typing import List
from fastapi import APIRouter

from database.supabase_client import SupabaseConfigError, get_supabase_admin_client, get_supabase_client
from schemas import FavoriteCreate, FavoriteResponse
from services.user_ids import is_guest_user_id, normalize_user_id

router = APIRouter()


def _is_guest_user(user_ref: str) -> bool:
    return is_guest_user_id(user_ref)


def _resolve_user_id(client, user_ref: str) -> str:
    if _is_guest_user(user_ref):
        return ""

    normalized_user_id = normalize_user_id(user_ref)
    return normalized_user_id


def _ensure_user(user_id: str) -> None:
    get_supabase_admin_client().table("users").upsert(
        {
            "id": user_id,
            "name": "Lector",
            "username": f"user-{user_id[:8]}",
            "email": f"user-{user_id[:8]}@novelle.local",
        },
        on_conflict="id",
    ).execute()


@router.post("/")
async def toggle_favorite(data: FavoriteCreate):
    """Add or remove a favorite in Supabase."""
    if _is_guest_user(data.user_id):
        return {
            "status": "local_only",
            "story_id": data.story_id,
            "user_id": data.user_id,
        }

    try:
        client = get_supabase_client()
        user_id = _resolve_user_id(client, data.user_id)
        if not user_id:
            return {
                "status": "local_only",
                "story_id": data.story_id,
                "user_id": data.user_id,
            }
        _ensure_user(user_id)

        existing = (
            client
            .table("favorites")
            .select("id")
            .eq("user_id", user_id)
            .eq("story_id", data.story_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            favorite_id = existing.data[0]["id"]
            client.table("favorites").delete().eq("id", favorite_id).execute()
            return {"status": "removed", "story_id": data.story_id}

        created = (
            client
            .table("favorites")
            .insert({"user_id": user_id, "story_id": data.story_id})
            .execute()
        )

        favorite = created.data[0] if created.data else None
        return {"status": "added", "favorite": favorite, "story_id": data.story_id}
    except SupabaseConfigError:
        return {
            "status": "local_only",
            "story_id": data.story_id,
            "user_id": data.user_id,
        }
    except Exception:
        return {
            "status": "local_only",
            "story_id": data.story_id,
            "user_id": data.user_id,
        }


@router.get("/{user_id}", response_model=List[FavoriteResponse])
async def get_favorites(user_id: str):
    """Get user favorites from Supabase."""
    if _is_guest_user(user_id):
        return []

    try:
        client = get_supabase_client()
        resolved_user_id = _resolve_user_id(client, user_id)
        if not resolved_user_id:
            return []

        response = (
            client
            .table("favorites")
            .select("id, user_id, story_id, created_at")
            .eq("user_id", resolved_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except SupabaseConfigError:
        return []
    except Exception:
        return []
