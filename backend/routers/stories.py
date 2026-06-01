# ═══════════════════════════════════════
# NOVELLE — Stories Router
# ═══════════════════════════════════════

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from database.supabase_client import SupabaseConfigError
from schemas import StoryCreate, StoryDetail, StoryResponse, StoryUpdate
from services.stories_service import (
    create_story_in_supabase,
    delete_story_from_supabase,
    get_created_stories_from_supabase,
    get_stories_from_supabase,
    get_story_from_supabase,
    update_story_in_supabase,
)

router = APIRouter()


@router.get("/", response_model=List[StoryResponse])
async def get_stories(category: Optional[str] = None, search: Optional[str] = None):
    """Get all stories with optional filters"""
    try:
        return get_stories_from_supabase(category=category, search=search)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/", response_model=StoryDetail, status_code=201)
async def create_story(story: StoryCreate):
    """Create a story and optional first scene"""
    try:
        return create_story_in_supabase(story)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/my-created/{user_id}", response_model=List[StoryResponse])
async def get_my_created_stories(user_id: str):
    """Get stories created by a temporary user identifier"""
    try:
        return get_created_stories_from_supabase(user_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/{story_id}", response_model=StoryDetail)
async def get_story(story_id: str):
    """Get story detail with scenes and endings"""
    try:
        story = get_story_from_supabase(story_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not story:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return story


@router.put("/{story_id}", response_model=StoryDetail)
async def update_story(story_id: str, story: StoryUpdate):
    """Update a story and optional first scene"""
    try:
        updated_story = update_story_in_supabase(story_id, story)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not updated_story:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return updated_story


@router.delete("/{story_id}")
async def delete_story(story_id: str):
    """Delete a story"""
    try:
        deleted = delete_story_from_supabase(story_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Historia no encontrada")

    return {"status": "deleted", "story_id": story_id}
