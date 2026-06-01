# NOVELLE - AI Router (Stub)

from uuid import uuid4

from fastapi import APIRouter

from database.supabase_client import get_supabase_admin_client
from pydantic import BaseModel
from schemas import AIGenerateCharacter, AIGenerateEnding, AIGenerateScene, AIResponse
from services.ai_service import (
    NarrativeContextManager,
    generate_character as generate_character_content,
    generate_dynamic_choices,
    generate_dynamic_scene,
    generate_ending as generate_ending_content,
    generate_scene as generate_scene_content,
    save_narrative_memory,
)
from services.user_ids import normalize_user_id

router = APIRouter()


class AIContinueStoryRequest(BaseModel):
    story_id: str
    current_scene_id: str
    decision_id: str | None = None
    decision_text: str
    selected_choice: str | None = None
    context: dict | None = None
    user_id: str | None = None


class AIGenerateChoicesRequest(BaseModel):
    story_id: str
    current_scene_id: str
    user_id: str | None = None


def _next_scene_order(story_id: str) -> int:
    try:
        response = (
            get_supabase_admin_client()
            .table("scenes")
            .select("scene_order")
            .eq("story_id", story_id)
            .order("scene_order", desc=True)
            .limit(1)
            .execute()
        )
        last = response.data[0]["scene_order"] if response.data else 0
        return int(last or 0) + 1
    except Exception:
        return 1


def _map_decision(decision: dict) -> dict:
    return {
        "id": str(decision["id"]),
        "text": decision.get("text") or "",
        "decision_text": decision.get("text") or "",
        "leads_to": decision.get("leads_to_scene") or decision.get("leads_to_ending") or "",
        "next_scene_id": decision.get("leads_to_scene"),
        "leads_to_scene": decision.get("leads_to_scene"),
        "leads_to_ending": decision.get("leads_to_ending"),
        "hint": decision.get("hint"),
        "consequence": decision.get("consequence"),
    }


def _save_ai_generation_log(story_id: str, context: dict, generated: dict) -> None:
    try:
        save_narrative_memory(story_id, context, generated)
    except Exception:
        pass


def _fallback_context(data: AIContinueStoryRequest) -> dict:
    reader_context = data.context or {}
    return {
        "story": {"id": data.story_id, "title": "Historia", "description": ""},
        "category": {},
        "category_name": "General",
        "genre_key": "general",
        "genre_guidance": "Continuacion narrativa coherente con la escena actual.",
        "current_scene": {
            "id": data.current_scene_id,
            "title": reader_context.get("currentSceneTitle") or "Escena actual",
            "content": reader_context.get("currentSceneContent") or "",
        },
        "previous_scenes": [],
        "known_characters": [],
        "decisions_taken": [],
        "available_decisions": [],
        "selected_decision": data.selected_choice or data.decision_text or "Continuar",
        "tone": "cinematografico",
        "important_events": [],
        "character_states": [],
        "relationships": [],
        "inventory": [],
        "emotional_tone": "expectativa",
        "unresolved_conflicts": [],
        "narrative_memory": {},
        "emotional_state": "expectativa",
    }


def _fallback_generated(data: AIContinueStoryRequest, context: dict) -> dict:
    selected = data.selected_choice or data.decision_text or "continuar"
    current_scene = context.get("current_scene") or {}
    scene_hint = current_scene.get("content") or "lo ultimo que acaba de ocurrir"
    scene_hint = str(scene_hint).strip()[:260]
    return {
        "scene_content": (
            f"{selected[:1].upper() + selected[1:].lower()} cambio el ritmo de la escena. "
            "Durante un instante, todo parecio contener la respiracion: los gestos pequenos, "
            "las palabras no dichas y la consecuencia inmediata de aquella eleccion.\n\n"
            f"Lo anterior seguia pesando en cada detalle: {scene_hint}. "
            "La situacion no se resolvio de golpe; se abrio con una claridad mas incomoda, "
            "como si cada personaje entendiera que el siguiente paso ya no podia ser casual.\n\n"
            "Entonces aparecio una nueva posibilidad, concreta y urgente. Habia que decidir "
            "si mirar mas de cerca, decir la verdad o tomar distancia antes de que fuera tarde."
        ),
        "choices": [
            "Mirar mas de cerca lo que acaba de cambiar",
            "Decir la verdad antes de perder la oportunidad",
            "Tomar distancia y pensar el siguiente movimiento",
        ],
        "tone": context.get("tone") or "cinematografico",
        "important_events": ["La decision anterior produjo una consecuencia inmediata."],
        "character_states": [],
        "relationships": [],
        "inventory": [],
        "emotional_tone": "tension contenida",
        "unresolved_conflicts": ["Elegir como responder a la consecuencia de la decision."],
    }


def _build_scene_payload(data: AIContinueStoryRequest, generated: dict, scene: dict, decisions: list[dict]) -> dict:
    return {
        "id": str(scene["id"]),
        "story_id": str(scene["story_id"]),
        "title": scene.get("title") or "Continuacion",
        "content": scene.get("content") or "",
        "scene_order": int(scene.get("scene_order") or 0),
        "order": int(scene.get("scene_order") or 0),
        "is_decision_point": bool(decisions),
        "is_ending": False,
        "tone": generated.get("tone"),
        "important_events": generated.get("important_events", []),
        "character_states": generated.get("character_states", []),
        "relationships": generated.get("relationships", []),
        "inventory": generated.get("inventory", []),
        "emotional_tone": generated.get("emotional_tone"),
        "unresolved_conflicts": generated.get("unresolved_conflicts", []),
        "decisions": [_map_decision(decision) for decision in decisions],
    }


@router.post("/generate-scene", response_model=AIResponse)
async def generate_scene(data: AIGenerateScene):
    """Generate a new scene using Gemini with mock fallback."""
    return generate_scene_content(data)


@router.post("/generate-ending", response_model=AIResponse)
async def generate_ending(data: AIGenerateEnding):
    """Generate an ending using Gemini with mock fallback."""
    return generate_ending_content(data)


@router.post("/generate-character", response_model=AIResponse)
async def generate_character(data: AIGenerateCharacter):
    """Generate a character using Gemini with mock fallback."""
    return generate_character_content(data)


@router.post("/continue-story")
async def continue_story(data: AIContinueStoryRequest):
    """Continue a story dynamically with Gemini and persist the generated branch."""
    normalized_user_id = normalize_user_id(data.user_id)

    try:
        context = NarrativeContextManager(
            story_id=data.story_id,
            current_scene_id=data.current_scene_id,
            selected_decision_text=data.selected_choice or data.decision_text,
            user_id=normalized_user_id,
        ).build()
    except Exception:
        context = _fallback_context(data)

    if data.context:
        context["reader_context"] = data.context

    try:
        generated = generate_dynamic_scene(context)
    except Exception:
        generated = _fallback_generated(data, context)

    try:
        scene_response = (
            get_supabase_admin_client()
            .table("scenes")
            .insert(
                {
                    "story_id": data.story_id,
                    "title": "Continuacion",
                    "content": generated["scene_content"],
                    "scene_order": _next_scene_order(data.story_id),
                    "is_decision_point": True,
                }
            )
            .execute()
        )
        scene = scene_response.data[0]
    except Exception:
        scene = {
            "id": f"ai-temp-{uuid4()}",
            "story_id": data.story_id,
            "title": "Continuacion",
            "content": generated.get("scene_content") or _fallback_generated(data, context)["scene_content"],
            "scene_order": _next_scene_order(data.story_id),
        }

    if data.decision_id:
        try:
            get_supabase_admin_client().table("decisions").update(
                {"leads_to_scene": scene["id"]}
            ).eq("id", data.decision_id).execute()
        except Exception:
            pass

    choices = generated.get("choices") or []
    decision_rows = [
        {
            "scene_id": scene["id"],
            "text": choice,
            "decision_order": index,
        }
        for index, choice in enumerate(choices)
    ]
    try:
        decisions_response = (
            get_supabase_admin_client().table("decisions").insert(decision_rows).execute()
            if decision_rows
            else None
        )
        decisions = decisions_response.data if decisions_response else []
    except Exception:
        decisions = [
            {
                "id": f"ai-temp-{uuid4()}",
                "scene_id": scene["id"],
                "text": row["text"],
                "leads_to_scene": None,
                "leads_to_ending": None,
                "hint": "Decision generada temporalmente por IA.",
                "consequence": None,
            }
            for row in decision_rows
        ]
    _save_ai_generation_log(data.story_id, context, generated)

    return _build_scene_payload(data, generated, scene, decisions)


@router.post("/generate-choices")
async def generate_choices(data: AIGenerateChoicesRequest):
    """Generate natural reader choices for a scene without manual decisions."""
    normalized_user_id = normalize_user_id(data.user_id)
    try:
        context = NarrativeContextManager(
            story_id=data.story_id,
            current_scene_id=data.current_scene_id,
            user_id=normalized_user_id,
        ).build()
        generated = generate_dynamic_choices(context)
    except Exception:
        generated = {
            "choices": [
                "Mirar mas de cerca lo que acaba de cambiar",
                "Decir la verdad antes de perder la oportunidad",
                "Tomar distancia y pensar el siguiente movimiento",
            ],
            "tone": "cinematografico",
            "important_events": [],
        }

    return {
        "choices": generated.get("choices") or [],
        "tone": generated.get("tone"),
        "important_events": generated.get("important_events", []),
    }
