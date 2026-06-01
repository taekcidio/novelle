# ═══════════════════════════════════════
# NOVELLE — Pydantic Schemas
# ═══════════════════════════════════════

from pydantic import BaseModel, EmailStr, Field
from typing import Any, Literal, Optional, List
from datetime import datetime


# ─── Auth / User ─────────────────────
class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    username: str = Field(..., min_length=3, max_length=20)
    email: str
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Story ───────────────────────────
class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    stories_count: int = 0


class StoryBase(BaseModel):
    title: str
    description: str
    category: str
    category_id: Optional[str] = None
    author: str
    user_id: Optional[str] = None
    cover: Optional[str] = None
    rating: float = 0
    readers: int = 0
    endings_count: int = 0
    reading_time: Optional[str] = None


class StoryResponse(StoryBase):
    id: str
    status: str = "published"
    created_at: Optional[datetime] = None


class StoryCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    author: str = Field(..., min_length=1)
    user_id: Optional[str] = None
    category_id: str = Field(..., min_length=1)
    cover_image: Optional[str] = None
    status: Literal["draft", "review", "published", "archived"] = "draft"
    first_scene_content: Optional[str] = None
    initial_content: Optional[str] = None


class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    user_id: Optional[str] = None
    category_id: Optional[str] = None
    cover_image: Optional[str] = None
    status: Optional[Literal["draft", "review", "published", "archived"]] = None
    first_scene_content: Optional[str] = None
    initial_content: Optional[str] = None


class StoryDetail(StoryResponse):
    scenes: List["SceneResponse"] = []
    endings: List["EndingResponse"] = []


# ─── Scene ───────────────────────────
class SceneResponse(BaseModel):
    id: str
    title: str
    content: str
    order: int
    is_decision_point: bool
    decisions: List["DecisionResponse"] = []


# ─── Decision ────────────────────────
class DecisionResponse(BaseModel):
    id: str
    text: str
    leads_to: str
    hint: Optional[str] = None


class DecisionCreate(BaseModel):
    story_id: str
    scene_id: str
    decision_id: str
    user_id: str


# ─── Ending ──────────────────────────
class EndingResponse(BaseModel):
    id: str
    title: str
    content: str
    ending_type: str


# ─── Progress ────────────────────────
class ProgressCreate(BaseModel):
    user_id: str
    story_id: str
    current_scene: str
    decisions: List[Any] = []
    completed: bool = False


class ProgressResponse(ProgressCreate):
    updated_at: Optional[datetime] = None


# ─── Favorites ───────────────────────
class FavoriteCreate(BaseModel):
    user_id: str
    story_id: str


class FavoriteResponse(BaseModel):
    id: Optional[str] = None
    user_id: str
    story_id: str
    created_at: Optional[datetime] = None


class CommentCreate(BaseModel):
    story_id: str = Field(..., min_length=1)
    user_id: str = Field(..., min_length=1)
    user_name: str = Field(..., min_length=1, max_length=100)
    user_avatar: Optional[str] = None
    content: str = Field(..., min_length=1, max_length=500)


class CommentDelete(BaseModel):
    user_id: str = Field(..., min_length=1)


class CommentResponse(BaseModel):
    id: str
    story_id: str
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    content: str
    created_at: Optional[datetime] = None


# ─── AI ──────────────────────────────
class AIGenerateScene(BaseModel):
    story_id: str
    context: str
    previous_decisions: List[str] = []
    tone: str = "neutral"


class AIGenerateEnding(BaseModel):
    story_id: str
    context: str
    decisions_path: List[str] = []


class AIGenerateCharacter(BaseModel):
    story_id: str
    role: str
    context: str


class AIResponse(BaseModel):
    content: str
    content_type: str
    generated_at: datetime
