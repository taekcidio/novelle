from fastapi import APIRouter, HTTPException

from database.supabase_client import SupabaseConfigError, get_supabase_admin_client
from schemas import DecisionCreate

router = APIRouter()


@router.post("/")
async def record_decision(data: DecisionCreate):
    """Validate a real decision exists before the frontend saves progress."""
    try:
        response = (
            get_supabase_admin_client()
            .table("decisions")
            .select("id, scene_id, leads_to_scene, leads_to_ending")
            .eq("id", data.decision_id)
            .eq("scene_id", data.scene_id)
            .limit(1)
            .execute()
        )
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Could not validate decision in Supabase: {exc}",
        ) from exc

    if not response.data:
        raise HTTPException(status_code=404, detail="Decision no encontrada")

    decision = response.data[0]
    return {
        "status": "recorded",
        "decision_id": str(decision["id"]),
        "next_scene_id": decision.get("leads_to_scene"),
        "ending_id": decision.get("leads_to_ending"),
    }
