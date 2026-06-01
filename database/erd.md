# Novelle — Modelo de Datos

## Diagrama Entidad-Relación

```mermaid
erDiagram
    USERS ||--o{ USER_PROGRESS : tiene
    USERS ||--o{ USER_HISTORY : tiene
    USERS ||--o{ FAVORITES : tiene

    CATEGORIES ||--o{ STORIES : contiene

    STORIES ||--o{ SCENES : contiene
    STORIES ||--o{ CHARACTERS : tiene
    STORIES ||--o{ ENDINGS : tiene
    STORIES ||--o{ AI_GENERATION_LOGS : genera

    SCENES ||--o{ DECISIONS : presenta

    DECISIONS }o--|| SCENES : "lleva a"
    DECISIONS }o--|| ENDINGS : "lleva a"

    USER_PROGRESS }o--|| STORIES : sigue
    USER_HISTORY }o--|| STORIES : registra
    FAVORITES }o--|| STORIES : marca
```

## Tablas

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios registrados |
| `stories` | Historias interactivas |
| `scenes` | Escenas narrativas dentro de historias |
| `decisions` | Opciones de decisión en puntos clave |
| `endings` | Finales posibles para cada historia |
| `characters` | Personajes de las historias |
| `categories` | Géneros/categorías |
| `user_progress` | Progreso de lectura del usuario |
| `user_history` | Historial de lecturas |
| `favorites` | Historias marcadas como favoritas |
| `ai_generation_logs` | Registros de contenido generado por IA |
