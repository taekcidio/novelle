# Novelle — Arquitectura del Sistema

## Visión General

Novelle es una plataforma de historias interactivas con una arquitectura de 3 capas desacopladas que se comunican mediante APIs REST.

```
┌─────────────────────────────────────────┐
│              FRONTEND (SPA)             │
│         HTML5 + SASS + Vanilla JS       │
│         Puerto: archivo estático        │
└──────────────────┬──────────────────────┘
                   │ Fetch API (REST)
                   ▼
┌─────────────────────────────────────────┐
│             BACKEND (API)               │
│              FastAPI (Python)           │
│              Puerto: 8000              │
└──────────────────┬──────────────────────┘
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
    ┌──────────┐ ┌──────┐ ┌──────┐
    │ Supabase │ │ Fire │ │  IA  │
    │   (DB)   │ │ base │ │ API  │
    └──────────┘ └──────┘ └──────┘

┌─────────────────────────────────────────┐
│              CMS (Admin)                │
│           Django + Django Admin         │
│              Puerto: 8001              │
└─────────────────────────────────────────┘
```

## Stack Tecnológico

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Frontend | HTML5 + SASS + JS Vanilla | Sin frameworks — máximo control, rendimiento, portabilidad |
| Backend | FastAPI | Alto rendimiento, documentación automática, tipado |
| CMS | Django Admin | Panel admin robusto out-of-the-box |
| Base de datos | Supabase (PostgreSQL) | BaaS con API REST, auth, realtime |
| Auth | Firebase Authentication | Escalable, OAuth social |
| IA | OpenAI/Gemini (pluggable) | Generación narrativa dinámica |

## Principios Arquitectónicos

1. **Desacoplamiento**: Cada capa es independiente y reemplazable
2. **Mobile First**: Diseño responsive desde 375px
3. **SPA con Hash Router**: Navegación fluida sin recargas
4. **Mock First**: Todo funciona con datos mock, APIs reales se conectan después
5. **Tematización CSS Variables**: Modo oscuro/claro sin JavaScript pesado
6. **Progressive Enhancement**: Funciona sin JS para contenido estático
