import re
from typing import Any

from database.supabase_client import get_supabase_client
from schemas import CommentCreate, CommentResponse


HTML_TAG_RE = re.compile(r"<[^>]*>")


def _sanitize_comment_text(value: str) -> str:
    cleaned = HTML_TAG_RE.sub("", value or "")
    cleaned = cleaned.replace("<", "").replace(">", "")
    return " ".join(cleaned.strip().split())[:500]


def _map_comment(comment: dict[str, Any]) -> CommentResponse:
    return CommentResponse(
        id=str(comment["id"]),
        story_id=str(comment["story_id"]),
        user_id=str(comment["user_id"]),
        user_name=comment.get("user_name") or "Lector",
        user_avatar=comment.get("user_avatar"),
        content=comment.get("content") or "",
        created_at=comment.get("created_at"),
    )


def get_comments_for_story(story_id: str) -> list[CommentResponse]:
    response = (
        get_supabase_client()
        .table("comments")
        .select("id, story_id, user_id, user_name, user_avatar, content, created_at")
        .eq("story_id", story_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_map_comment(comment) for comment in response.data or []]


def create_comment(comment: CommentCreate) -> CommentResponse:
    content = _sanitize_comment_text(comment.content)
    if not content:
        raise ValueError("El comentario no puede estar vacio.")

    payload = {
        "story_id": comment.story_id,
        "user_id": comment.user_id.strip(),
        "user_name": _sanitize_comment_text(comment.user_name)[:100] or "Lector",
        "user_avatar": comment.user_avatar,
        "content": content,
    }

    response = get_supabase_client().table("comments").insert(payload).execute()
    if not response.data:
        raise RuntimeError("Supabase no devolvio el comentario creado.")

    return _map_comment(response.data[0])


def delete_comment(comment_id: str, user_id: str) -> bool:
    request_user_id = user_id.strip()
    existing = (
        get_supabase_client()
        .table("comments")
        .select("id, user_id")
        .eq("id", comment_id)
        .limit(1)
        .execute()
    )

    if not existing.data:
        return False

    if str(existing.data[0].get("user_id")) != request_user_id:
        raise PermissionError("Solo puedes eliminar tus propios comentarios.")

    get_supabase_client().table("comments").delete().eq("id", comment_id).execute()
    return True
