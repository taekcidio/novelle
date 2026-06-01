from fastapi import APIRouter, HTTPException

from database.supabase_client import SupabaseConfigError, get_supabase_admin_client

router = APIRouter()


def _map_decision(decision: dict) -> dict:
    next_scene_id = decision.get("leads_to_scene")
    ending_id = decision.get("leads_to_ending")

    return {
        "id": str(decision["id"]),
        "text": decision.get("text") or decision.get("decision_text") or "",
        "decision_text": decision.get("text") or decision.get("decision_text") or "",
        "leads_to": str(next_scene_id or ending_id or ""),
        "next_scene_id": str(next_scene_id) if next_scene_id else None,
        "leads_to_scene": str(next_scene_id) if next_scene_id else None,
        "leads_to_ending": str(ending_id) if ending_id else None,
        "hint": decision.get("hint"),
        "consequence": decision.get("consequence"),
    }


def _map_scene(scene: dict, decisions: list[dict]) -> dict:
    return {
        "id": str(scene["id"]),
        "story_id": str(scene["story_id"]),
        "title": scene.get("title") or "Escena",
        "content": scene.get("content") or "",
        "scene_order": int(scene.get("scene_order") or 0),
        "order": int(scene.get("scene_order") or 0),
        "is_decision_point": bool(scene.get("is_decision_point")) or bool(decisions),
        "is_ending": bool(scene.get("is_ending", False)),
        "decisions": [_map_decision(decision) for decision in decisions],
    }


def _fetch_decisions(scene_id: str) -> list[dict]:
    response = (
        get_supabase_admin_client()
        .table("decisions")
        .select("*")
        .eq("scene_id", scene_id)
        .order("decision_order")
        .execute()
    )
    return response.data or []


def _fetch_scene(story_id: str, scene_id: str | None = None) -> dict | None:
    query = (
        get_supabase_admin_client()
        .table("scenes")
        .select("*")
        .eq("story_id", story_id)
    )

    if scene_id:
        query = query.eq("id", scene_id)
    else:
        query = query.order("scene_order").limit(1)

    response = query.execute()
    if not response.data:
        return None

    scene = response.data[0]
    decisions = _fetch_decisions(scene["id"])
    return _map_scene(scene, decisions)


@router.get("/stories/{story_id}/scenes/first")
async def get_first_scene(story_id: str):
    """Get the first scene from a story with its real decisions."""
    try:
        scene = _fetch_scene(story_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch first scene from Supabase: {exc}",
        ) from exc

    if not scene:
        return {"message": "Esta historia aun no tiene contenido inicial."}

    return scene


@router.get("/stories/{story_id}/scenes/{scene_id}")
async def get_scene(story_id: str, scene_id: str):
    """Get a specific scene from Supabase with its real decisions."""
    try:
        scene = _fetch_scene(story_id, scene_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch scene from Supabase: {exc}",
        ) from exc

    if not scene:
        raise HTTPException(status_code=404, detail="Escena no encontrada")

    return scene


@router.get("/stories/{story_id}/endings/{ending_id}")
async def get_ending(story_id: str, ending_id: str):
    """Get a real ending from Supabase."""
    try:
        response = (
            get_supabase_admin_client()
            .table("endings")
            .select("*")
            .eq("story_id", story_id)
            .eq("id", ending_id)
            .limit(1)
            .execute()
        )
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch ending from Supabase: {exc}",
        ) from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Final no encontrado")

    ending = response.data[0]
    return {
        "id": str(ending["id"]),
        "story_id": str(ending["story_id"]),
        "title": ending.get("title") or "Final",
        "content": ending.get("content") or "",
        "description": ending.get("content") or "",
        "ending_type": ending.get("ending_type"),
    }
