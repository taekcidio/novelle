# ═══════════════════════════════════════
# NOVELLE — FastAPI Main Entry
# ═══════════════════════════════════════

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, stories, scenes, progress, decisions, favorites, history, ai, categories, comments
from database.supabase_client import SupabaseConfigError, verify_supabase_connection

app = FastAPI(
    title="Novelle API",
    description="API para la plataforma de historias interactivas Novelle",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["Categories"])
app.include_router(stories.router, prefix="/api/v1/stories", tags=["Stories"])
app.include_router(scenes.router, prefix="/api/v1", tags=["Scenes"])
app.include_router(progress.router, prefix="/api/v1/progress", tags=["Progress"])
app.include_router(decisions.router, prefix="/api/v1/decisions", tags=["Decisions"])
app.include_router(favorites.router, prefix="/api/v1/favorites", tags=["Favorites"])
app.include_router(history.router, prefix="/api/v1/history", tags=["History"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "app": "Novelle API", "version": "1.0.0"}


@app.get("/health/supabase", tags=["Health"])
def supabase_health_check():
    try:
        if verify_supabase_connection():
            return {"status": "ok", "supabase": "client_configured"}
    except SupabaseConfigError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    raise HTTPException(status_code=500, detail="Supabase connection failed")
