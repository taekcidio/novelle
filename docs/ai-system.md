# Novelle — Sistema de IA

## Visión General

La inteligencia artificial en Novelle se utiliza para generar contenido narrativo dinámico que complementa las historias creadas manualmente.

## Capacidades

### 1. Generación de Escenas
La IA puede crear nuevas escenas narrativas basándose en:
- El contexto actual de la historia
- Las decisiones previas del usuario
- El tono y género de la historia
- Los personajes involucrados

### 2. Generación de Finales
Crea finales personalizados según:
- El camino narrativo del usuario
- Las decisiones acumuladas
- El tipo de historia

### 3. Creación de Personajes
Genera perfiles de personajes con:
- Nombre y descripción
- Personalidad y motivaciones
- Rol en la historia
- Diálogos característicos

### 4. Diálogos Dinámicos
Crea diálogos contextuales que:
- Mantienen la voz del personaje
- Responden al contexto narrativo
- Se adaptan al tono de la escena

## Arquitectura de Integración

```
Usuario → Decisión → Backend → AI Service → Proveedor IA → Respuesta → Escena
```

## Prompt Engineering

### Template para Escenas
```
Contexto: {story_description}
Género: {category}
Escena anterior: {previous_scene_summary}
Decisión del usuario: {user_decision}
Personajes presentes: {characters}
Tono: {tone}

Genera una escena narrativa de 200-400 palabras que continúe la historia
de manera coherente con el contexto y la decisión tomada.
```

## Proveedores Soportados (Futuro)
- OpenAI GPT-4
- Google Gemini
- Anthropic Claude
- Modelos locales (Ollama)

## Flujo de Aprobación
1. La IA genera contenido
2. El contenido se registra en `ai_generation_logs`
3. Un administrador revisa desde el CMS
4. Se aprueba o rechaza el contenido
5. El contenido aprobado se integra en la historia
