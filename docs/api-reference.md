# Novelle — Referencia API

## Base URL
```
http://localhost:8000/api/v1
```

## Autenticación

### POST /auth/register
Registra un nuevo usuario.

**Body:**
```json
{
  "name": "Laura García",
  "username": "lauragarcia",
  "email": "laura@novelle.app",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": "user-001",
    "name": "Laura García",
    "username": "lauragarcia",
    "email": "laura@novelle.app"
  }
}
```

### POST /auth/login
Autentica un usuario existente.

**Body:**
```json
{
  "email": "laura@novelle.app",
  "password": "SecurePass123!"
}
```

---

## Historias

### GET /stories
Lista todas las historias publicadas.

**Query Params:** `?category=mystery&search=faro`

### GET /stories/{id}
Obtiene detalle de una historia con escenas y finales.

### GET /stories/{id}/scenes/{scene_id}
Obtiene una escena específica con sus decisiones.

---

## Progreso

### POST /progress
Guarda progreso de lectura.

### GET /progress/{user_id}
Obtiene todo el progreso del usuario.

---

## Decisiones

### POST /decisions
Registra una decisión del usuario.

---

## Favoritos

### POST /favorites
Agrega/remueve un favorito (toggle).

### GET /favorites/{user_id}
Lista favoritos del usuario.

---

## Historial

### GET /history/{user_id}
Obtiene historial de lecturas.

---

## IA (Stubs)

### POST /ai/generate-scene
Genera una escena narrativa.

### POST /ai/generate-ending
Genera un final.

### POST /ai/generate-character
Genera un personaje.

---

## Documentación Interactiva
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
