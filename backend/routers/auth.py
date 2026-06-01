from fastapi import APIRouter, HTTPException, status

from schemas import TokenResponse, UserCreate, UserLogin

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(user: UserCreate):
    """Auth is handled by Firebase on the frontend."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="La autenticacion de Novelle se gestiona con Firebase Auth.",
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Auth is handled by Firebase on the frontend."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="La autenticacion de Novelle se gestiona con Firebase Auth.",
    )
