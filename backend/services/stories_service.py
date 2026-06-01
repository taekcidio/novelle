from typing import Any, Optional

from database.supabase_client import SupabaseConfigError, get_supabase_client
from schemas import (
    EndingResponse,
    SceneResponse,
    StoryCreate,
    StoryDetail,
    StoryResponse,
    StoryUpdate,
)
from services.user_ids import normalize_user_id


def _story_category(story: dict[str, Any]) -> str:
    if story.get("category_id"):
        return "unknown"
    return story.get("category") or "unknown"


def _map_story_response(story: dict[str, Any]) -> StoryResponse:
    return StoryResponse(
        id=str(story["id"]),
        title=story["title"],
        description=story["description"],
        category=_story_category(story),
        category_id=story.get("category_id"),
        author=story["author"],
        user_id=story.get("user_id"),
        cover=story.get("cover_image") or story.get("cover"),
        rating=float(story.get("rating") or 0),
        readers=int(story.get("readers") or 0),
        endings_count=int(story.get("endings_count") or 0),
        reading_time=story.get("reading_time"),
        status=story.get("status") or "published",
        created_at=story.get("created_at"),
    )


def _map_scene_response(scene: dict[str, Any]) -> SceneResponse:
    return SceneResponse(
        id=str(scene["id"]),
        title=scene["title"],
        content=scene["content"],
        order=int(scene.get("scene_order") or scene.get("order") or 0),
        is_decision_point=bool(scene.get("is_decision_point")),
        decisions=[],
    )


def _map_ending_response(ending: dict[str, Any]) -> EndingResponse:
    return EndingResponse(
        id=str(ending["id"]),
        title=ending["title"],
        content=ending["content"],
        ending_type=ending.get("ending_type") or "unknown",
    )


def _matches_category(story: StoryResponse, category: Optional[str]) -> bool:
    if not category:
        return True
    return story.category == category


def _matches_search(story: StoryResponse, search: Optional[str]) -> bool:
    if not search:
        return True

    query = search.lower()
    return query in story.title.lower() or query in story.description.lower()


def get_stories_from_supabase(
    category: Optional[str] = None,
    search: Optional[str] = None,
) -> list[StoryResponse]:
    try:
        response = (
            get_supabase_client()
            .table("stories")
            .select("*")
            .eq("status", "published")
            .execute()
        )
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not fetch stories from Supabase: {exc}") from exc

    stories = [_map_story_response(story) for story in response.data or []]
    return [
        story
        for story in stories
        if _matches_category(story, category) and _matches_search(story, search)
    ]


def create_story_in_supabase(story_data: StoryCreate) -> StoryDetail:
    story_payload = {
        "title": story_data.title,
        "description": story_data.description,
        "author": story_data.author,
        "category_id": story_data.category_id,
        "cover_image": story_data.cover_image or None,
        "status": story_data.status,
    }
    if story_data.user_id:
        story_payload["user_id"] = normalize_user_id(story_data.user_id)

    try:
        story_response = _insert_story(story_payload)
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not create story in Supabase: {exc}") from exc

    if not story_response.data:
        raise RuntimeError("Could not create story in Supabase: empty response")

    story = _map_story_response(story_response.data[0])
    scenes = []

    first_scene_content = story_data.first_scene_content or story_data.initial_content

    if first_scene_content:
        scene_payload = {
            "story_id": story.id,
            "title": "Inicio",
            "content": first_scene_content,
            "scene_order": 1,
            "is_decision_point": False,
        }

        try:
            scene_response = (
                get_supabase_client()
                .table("scenes")
                .insert(scene_payload)
                .execute()
            )
        except SupabaseConfigError:
            raise
        except Exception as exc:
            raise RuntimeError(f"Could not create first scene in Supabase: {exc}") from exc

        scenes = [_map_scene_response(scene) for scene in scene_response.data or []]

    return StoryDetail(
        **story.model_dump(),
        scenes=scenes,
        endings=[],
    )


def update_story_in_supabase(story_id: str, story_data: StoryUpdate) -> Optional[StoryDetail]:
    story_payload = story_data.model_dump(
        exclude={"first_scene_content", "initial_content"},
        exclude_unset=True,
    )
    if story_payload.get("user_id"):
        story_payload["user_id"] = normalize_user_id(story_payload["user_id"])

    try:
        if story_payload:
            update_response = (
                _update_story(story_id, story_payload)
            )
            if update_response.data == []:
                return None

        first_scene_content = (
            story_data.first_scene_content
            if story_data.first_scene_content is not None
            else story_data.initial_content
        )
        if first_scene_content is not None:
            _upsert_first_scene(story_id, first_scene_content)
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not update story in Supabase: {exc}") from exc

    return get_story_from_supabase(story_id)


def delete_story_from_supabase(story_id: str) -> bool:
    try:
        existing = (
            get_supabase_client()
            .table("stories")
            .select("id")
            .eq("id", story_id)
            .limit(1)
            .execute()
        )
        if not existing.data:
            return False

        get_supabase_client().table("stories").delete().eq("id", story_id).execute()
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not delete story from Supabase: {exc}") from exc

    return True


def get_created_stories_from_supabase(user_id: str) -> list[StoryResponse]:
    try:
        response = _select_created_stories(user_id)
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not fetch created stories from Supabase: {exc}") from exc

    return [_map_story_response(story) for story in response.data or []]


def _insert_story(story_payload: dict[str, Any]):
    try:
        return get_supabase_client().table("stories").insert(story_payload).execute()
    except Exception as exc:
        if "user_id" not in story_payload or not _looks_like_missing_user_id_column(exc):
            raise
        fallback_payload = {key: value for key, value in story_payload.items() if key != "user_id"}
        return get_supabase_client().table("stories").insert(fallback_payload).execute()


def _update_story(story_id: str, story_payload: dict[str, Any]):
    try:
        return (
            get_supabase_client()
            .table("stories")
            .update(story_payload)
            .eq("id", story_id)
            .execute()
        )
    except Exception as exc:
        if "user_id" not in story_payload or not _looks_like_missing_user_id_column(exc):
            raise
        fallback_payload = {key: value for key, value in story_payload.items() if key != "user_id"}
        return (
            get_supabase_client()
            .table("stories")
            .update(fallback_payload)
            .eq("id", story_id)
            .execute()
        )


def _select_created_stories(user_id: str):
    normalized_user_id = normalize_user_id(user_id)
    try:
        response = (
            get_supabase_client()
            .table("stories")
            .select("*")
            .eq("user_id", normalized_user_id)
            .execute()
        )
        if response.data or normalized_user_id == user_id:
            return response

        legacy_response = (
            get_supabase_client()
            .table("stories")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        if legacy_response.data:
            return legacy_response

        return response
    except Exception as exc:
        if not _looks_like_missing_user_id_column(exc):
            raise
        return (
            get_supabase_client()
            .table("stories")
            .select("*")
            .eq("author", user_id)
            .execute()
        )


def _looks_like_missing_user_id_column(exc: Exception) -> bool:
    message = str(exc).lower()
    return "user_id" in message and ("column" in message or "schema cache" in message)


def _upsert_first_scene(story_id: str, content: str) -> None:
    scene_response = (
        get_supabase_client()
        .table("scenes")
        .select("id")
        .eq("story_id", story_id)
        .order("scene_order")
        .limit(1)
        .execute()
    )

    if scene_response.data:
        scene_id = scene_response.data[0]["id"]
        (
            get_supabase_client()
            .table("scenes")
            .update({"content": content})
            .eq("id", scene_id)
            .execute()
        )
        return

    (
        get_supabase_client()
        .table("scenes")
        .insert(
            {
                "story_id": story_id,
                "title": "Inicio",
                "content": content,
                "scene_order": 1,
                "is_decision_point": False,
            }
        )
        .execute()
    )


def get_story_from_supabase(story_id: str) -> Optional[StoryDetail]:
    try:
        story_response = (
            get_supabase_client()
            .table("stories")
            .select("*")
            .eq("id", story_id)
            .limit(1)
            .execute()
        )
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not fetch story from Supabase: {exc}") from exc

    if not story_response.data:
        return None

    story = _map_story_response(story_response.data[0])
    scenes = _get_story_scenes(story_id)
    endings = _get_story_endings(story_id)

    return StoryDetail(
        **story.model_dump(),
        scenes=scenes,
        endings=endings,
    )


def _get_story_scenes(story_id: str) -> list[SceneResponse]:
    try:
        response = (
            get_supabase_client()
            .table("scenes")
            .select("*")
            .eq("story_id", story_id)
            .order("scene_order")
            .execute()
        )
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not fetch story scenes from Supabase: {exc}") from exc

    return [_map_scene_response(scene) for scene in response.data or []]


def _get_story_endings(story_id: str) -> list[EndingResponse]:
    try:
        response = (
            get_supabase_client()
            .table("endings")
            .select("*")
            .eq("story_id", story_id)
            .execute()
        )
    except SupabaseConfigError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Could not fetch story endings from Supabase: {exc}") from exc

    return [_map_ending_response(ending) for ending in response.data or []]
