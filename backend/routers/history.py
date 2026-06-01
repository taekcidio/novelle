# NOVELLE — History Router
from fastapi import APIRouter
from database.supabase_client import SupabaseConfigError, get_supabase_client
from services.user_ids import normalize_user_id

router = APIRouter()

@router.get("/{user_id}")
async def get_history(user_id: str):
    """Get user reading history"""
    normalized_user_id = normalize_user_id(user_id)
    try:
        response = (
            get_supabase_client()
            .table("user_history")
            .select("story_id, action, created_at")
            .eq("user_id", normalized_user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []
    except (SupabaseConfigError, Exception):
        pass

    return []
