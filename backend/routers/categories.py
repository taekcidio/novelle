from fastapi import APIRouter, HTTPException
from typing import List

from database.supabase_client import (
    SupabaseConfigError,
    get_supabase_admin_client,
    has_supabase_service_role_key,
)
from schemas import CategoryResponse

router = APIRouter()

DEFAULT_CATEGORIES = [
    "Romance",
    "Misterio",
    "Fantasía",
    "Terror",
    "Aventura",
    "Drama",
    "Ciencia Ficción",
]


@router.get("/", response_model=List[CategoryResponse])
async def get_categories():
    """Get categories from Supabase."""
    try:
        response = (
            get_supabase_admin_client()
            .table("categories")
            .select("id, name, description")
            .order("name")
            .execute()
        )
        categories = response.data or []

        if categories:
            return _with_story_counts(categories)

        if not has_supabase_service_role_key():
            raise HTTPException(
                status_code=502,
                detail=(
                    "No categories are visible with the current Supabase key. "
                    "Add SUPABASE_SERVICE_ROLE_KEY on the backend or create a "
                    "SELECT policy for categories."
                ),
            )

        insert_response = (
            get_supabase_admin_client()
            .table("categories")
            .insert([{"name": name} for name in DEFAULT_CATEGORIES])
            .execute()
        )

        categories = insert_response.data or []
        return _with_story_counts(categories)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch categories from Supabase: {exc}",
        ) from exc


def _with_story_counts(categories: list[dict]) -> list[dict]:
    if not categories:
        return []

    story_response = (
        get_supabase_admin_client()
        .table("stories")
        .select("category_id")
        .eq("status", "published")
        .execute()
    )

    counts = {}
    for story in story_response.data or []:
        category_id = story.get("category_id")
        if category_id:
            counts[category_id] = counts.get(category_id, 0) + 1

    return [
        {
            "id": category["id"],
            "name": category["name"],
            "description": category.get("description"),
            "stories_count": counts.get(category["id"], 0),
        }
        for category in categories
    ]
