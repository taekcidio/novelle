# ✦ Novelle

**Plataforma de historias interactivas impulsada por inteligencia artificial.**

Novelle es una aplicación web donde los usuarios leen historias, toman decisiones narrativas, cambian el rumbo del relato y desbloquean finales diferentes según sus elecciones.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + SASS + JavaScript Vanilla |
| Backend | FastAPI (Python) |
| CMS | Django + Django Admin |
| Base de datos | Supabase (futuro) |
| Autenticación | Firebase Auth (futuro) |
| IA | Generación narrativa dinámica (futuro) |

## Estructura del Proyecto

```
novelle/
├── frontend/      → Interfaz de usuario (SPA)
├── backend/       → API REST con FastAPI
├── cms/           → Panel administrativo con Django
├── database/      → Esquemas SQL y datos semilla
├── docs/          → Documentación técnica
└── README.md
```

## Inicio Rápido

### Frontend
```bash
cd frontend
npm install
npm run dev     # Compila SASS en modo watch
```
Abrir `frontend/index.html` en el navegador.

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### CMS
```bash
cd cms
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8001
```

## Diseño

- Minimalista, elegante y moderno
- Paleta: blanco, negro, grises, acentos morado pastel
- Tipografías: Poppins, Inter, Montserrat
- Responsive y Mobile First
- Modo oscuro y claro

## Licencia

Proyecto privado. Todos los derechos reservados.
