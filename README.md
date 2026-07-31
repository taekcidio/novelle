
<div align="center">

# ✦ Novelle

### Historias interactivas donde cada decisión cambia el relato

Novelle es una aplicación web para leer historias, tomar decisiones narrativas y descubrir diferentes caminos y finales según las elecciones del usuario.

<br>

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![Sass](https://img.shields.io/badge/Sass-CC6699?style=flat-square&logo=sass&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Django](https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white)

</div>

---

## Sobre Novelle

Novelle propone una experiencia de lectura diferente: el lector no se limita a seguir una historia, sino que participa directamente en su desarrollo.

Durante cada relato, el usuario puede tomar decisiones que modifican los acontecimientos, abren nuevas rutas narrativas y conducen a finales distintos.

El proyecto está construido con una arquitectura separada por capas, compuesta por una interfaz web, una API REST y un panel administrativo para gestionar el contenido.

## Características principales

- Lectura de historias interactivas.
- Decisiones que modifican el desarrollo de la narrativa.
- Diferentes rutas y finales según las elecciones del usuario.
- Interfaz responsive con enfoque Mobile First.
- Soporte visual para modo claro y modo oscuro.
- API REST desarrollada con FastAPI.
- Panel administrativo construido con Django.
- Organización modular del frontend, backend, CMS y base de datos.

## Arquitectura

```text
┌──────────────────────────────┐
│          Frontend            │
│ HTML5 · Sass · JavaScript    │
└──────────────┬───────────────┘
               │
               │ HTTP / REST
               ▼
┌──────────────────────────────┐
│          Backend             │
│       FastAPI · Python       │
└──────────────┬───────────────┘
               │
               │ Gestión de contenido
               ▼
┌──────────────────────────────┐
│             CMS              │
│    Django · Django Admin     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Persistencia          │
│     Base de datos y seeds    │
└──────────────────────────────┘
````

## Tecnologías

| Capa          | Tecnología               | Uso                                                   |
| ------------- | ------------------------ | ----------------------------------------------------- |
| Frontend      | HTML5, Sass y JavaScript | Interfaz de usuario y experiencia interactiva         |
| Backend       | FastAPI y Python         | API REST y lógica de la aplicación                    |
| CMS           | Django y Django Admin    | Administración de historias y contenido               |
| Base de datos | Esquemas SQL             | Definición de la estructura de datos                  |
| Diseño        | Figma                    | Diseño inicial de interfaces y experiencia de usuario |

### Integraciones proyectadas

Las siguientes tecnologías forman parte de la evolución planeada del proyecto:

| Integración             | Propósito                                      |
| ----------------------- | ---------------------------------------------- |
| Supabase                | Persistencia y administración de datos         |
| Firebase Authentication | Registro e inicio de sesión de usuarios        |
| Inteligencia artificial | Generación y adaptación dinámica de narrativas |

## Estructura del proyecto

```text
novelle/
├── frontend/          # Interfaz principal de la aplicación
├── backend/           # API REST desarrollada con FastAPI
├── cms/               # Panel administrativo con Django
├── database/          # Esquemas SQL y datos iniciales
├── docs/              # Documentación técnica y funcional
├── .vscode/           # Configuración del entorno de desarrollo
├── vercel.json        # Configuración de despliegue del frontend
└── README.md          # Documentación principal del proyecto
```

## Instalación

### Requisitos previos

Antes de ejecutar el proyecto, asegúrate de tener instalado:

* Python 3.10 o superior.
* Node.js 18 o superior.
* npm.
* Git.

Clona el repositorio:

```bash
git clone https://github.com/taekcidio/novelle.git
cd novelle
```

## Ejecución del frontend

Ingresa al directorio del frontend:

```bash
cd frontend
```

Instala las dependencias:

```bash
npm install
```

Inicia la compilación de Sass en modo de observación:

```bash
npm run dev
```

Después, abre el archivo `frontend/index.html` en el navegador.

También puedes utilizar una extensión como Live Server desde Visual Studio Code para ejecutar la interfaz en un servidor local.

## Ejecución del backend

Desde la raíz del proyecto, ingresa al directorio del backend:

```bash
cd backend
```

Crea un entorno virtual:

```bash
python -m venv .venv
```

Activa el entorno virtual.

En Windows:

```bash
.venv\Scripts\activate
```

En Linux o macOS:

```bash
source .venv/bin/activate
```

Instala las dependencias:

```bash
pip install -r requirements.txt
```

Inicia la API:

```bash
uvicorn main:app --reload --port 8000
```

La API estará disponible en:

```text
http://localhost:8000
```

La documentación interactiva de FastAPI estará disponible en:

```text
http://localhost:8000/docs
```

## Ejecución del CMS

Desde la raíz del proyecto, ingresa al directorio del CMS:

```bash
cd cms
```

Crea y activa un entorno virtual si todavía no tienes uno configurado.

Instala las dependencias:

```bash
pip install -r requirements.txt
```

Aplica las migraciones:

```bash
python manage.py migrate
```

Crea un usuario administrador:

```bash
python manage.py createsuperuser
```

Inicia el servidor:

```bash
python manage.py runserver 8001
```

El panel administrativo estará disponible en:

```text
http://localhost:8001/admin
```

## Diseño de interfaz

La identidad visual de Novelle busca acompañar la experiencia narrativa sin distraer al lector.

### Principios visuales

* Diseño minimalista y moderno.
* Navegación sencilla.
* Interfaz responsive.
* Enfoque Mobile First.
* Jerarquía visual clara.
* Compatibilidad con modo claro y modo oscuro.
* Acentos en tonos morados suaves.

### Tipografías

* Poppins.
* Inter.
* Montserrat.

## Estado del proyecto

### Implementado

* Estructura modular del proyecto.
* Interfaz frontend inicial.
* Estilos con Sass.
* API REST con FastAPI.
* Panel administrativo con Django.
* Configuración para despliegue estático del frontend.
* Documentación técnica inicial.

### Próximas mejoras

* Conectar la aplicación con Supabase.
* Implementar autenticación con Firebase.
* Crear perfiles de usuario.
* Guardar el progreso de lectura.
* Administrar historias, capítulos y decisiones desde el CMS.
* Incorporar generación narrativa asistida por inteligencia artificial.
* Mejorar la accesibilidad de la interfaz.
* Agregar pruebas unitarias y de integración.
* Automatizar el despliegue de los diferentes componentes.

## Flujo general de una historia

```text
Inicio de la historia
        │
        ▼
Lectura del capítulo
        │
        ▼
Elección del usuario
        │
        ├── Opción A ──► Nueva ruta narrativa
        │
        └── Opción B ──► Ruta alternativa
                         │
                         ▼
                 Nuevas decisiones
                         │
                         ▼
                  Final desbloqueado
```

## Autora

Proyecto desarrollado por **Laura Valeria Espejo**, estudiante de Ingeniería de Software de la Universidad Manuela Beltrán.

[![GitHub](https://img.shields.io/badge/GitHub-taekcidio-181717?style=for-the-badge\&logo=github\&logoColor=white)](https://github.com/taekcidio)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Laura%20Valeria-0A66C2?style=for-the-badge\&logo=linkedin\&logoColor=white)](https://www.linkedin.com/in/laura-valeria-espejo-mantilla-236597355/)
[![Email](https://img.shields.io/badge/Email-valeriaespejo2006%40gmail.com-EA4335?style=for-the-badge\&logo=gmail\&logoColor=white)](mailto:valeriaespejo2006@gmail.com)



---

<div align="center">

**Novelle** · Cada elección abre una historia diferente.

</div>
```
