from fastapi import APIRouter, HTTPException

from database.supabase_client import SupabaseConfigError
from schemas import CommentCreate, CommentDelete, CommentResponse
from services.comments_service import (
    create_comment,
    delete_comment,
    get_comments_for_story,
)

router = APIRouter()


@router.get("/{story_id}", response_model=list[CommentResponse])
async def get_comments(story_id: str):
    try:
        return get_comments_for_story(story_id)
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="No pudimos cargar los comentarios en este momento.",
        ) from exc


@router.post("/", response_model=CommentResponse, status_code=201)
async def post_comment(comment: CommentCreate):
    try:
        return create_comment(comment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="No pudimos publicar tu comentario. Intenta de nuevo en un momento.",
        ) from exc


@router.delete("/{comment_id}")
async def remove_comment(comment_id: str, payload: CommentDelete):
    try:
        deleted = delete_comment(comment_id, payload.user_id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="No pudimos eliminar el comentario. Intenta de nuevo en un momento.",
        ) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Comentario no encontrado.")

    return {"status": "deleted", "comment_id": comment_id}
