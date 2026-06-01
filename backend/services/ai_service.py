import json
import re
from ast import literal_eval
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from config import settings
from database.supabase_client import get_supabase_admin_client
from schemas import AIGenerateCharacter, AIGenerateEnding, AIGenerateScene, AIResponse
from services.user_ids import normalize_user_id

try:
    from google import genai
except ImportError:  # pragma: no cover - handled as runtime fallback
    genai = None


MEMORY_FILE = Path(__file__).resolve().parents[1] / "data" / "narrative_memory.json"


SAFETY_INSTRUCTIONS = (
    "Escribe siempre en espanol. Mantén un estilo narrativo cinematografico, "
    "limpio, coherente y apto para una app de historias interactivas. "
    "No generes contenido sexual explicito, gore, violencia grafica extrema, "
    "odio, instrucciones peligrosas ni contenido que rompa el tono editorial."
)


@dataclass
class NarrativeContextManager:
    story_id: str
    current_scene_id: str | None = None
    selected_decision_text: str | None = None
    user_id: str | None = None

    def build(self) -> dict[str, Any]:
        client = get_supabase_admin_client()
        story = self._single(
            client.table("stories").select("*").eq("id", self.story_id).limit(1).execute().data
        )
        category = self._fetch_category(client, story)
        scenes = (
            client.table("scenes")
            .select("*")
            .eq("story_id", self.story_id)
            .order("scene_order")
            .execute()
            .data
            or []
        )
        decisions = self._fetch_decisions(client, [scene["id"] for scene in scenes])
        endings = (
            client.table("endings")
            .select("*")
            .eq("story_id", self.story_id)
            .execute()
            .data
            or []
        )
        progress = self._fetch_progress(client)

        known_characters = (
            client.table("characters")
            .select("*")
            .eq("story_id", self.story_id)
            .execute()
            .data
            or []
        )

        previous_scenes = self._previous_scenes(scenes)
        important_events = self._important_events(story, previous_scenes, endings)
        narrative_memory = self._fetch_narrative_memory(client)
        current_scene = self._current_scene(scenes)
        genre_key = _genre_key(category, story)

        return {
            "story": story or {},
            "category": category or {},
            "category_name": _category_name(category, story),
            "genre_key": genre_key,
            "genre_guidance": _genre_guidance(genre_key),
            "current_scene": current_scene or {},
            "previous_scenes": previous_scenes,
            "known_characters": known_characters,
            "decisions_taken": progress.get("decisions_path") if progress else [],
            "available_decisions": decisions,
            "selected_decision": self.selected_decision_text,
            "tone": self._infer_tone(story, previous_scenes),
            "important_events": self._merge_unique(
                narrative_memory.get("important_events", []),
                important_events,
            ),
            "character_states": narrative_memory.get("character_states", []),
            "relationships": self._merge_unique(
                narrative_memory.get("relationships", []),
                self._infer_relationships(known_characters),
            ),
            "inventory": narrative_memory.get("inventory", []),
            "emotional_tone": narrative_memory.get("emotional_tone")
            or self._infer_emotional_state(previous_scenes),
            "unresolved_conflicts": narrative_memory.get("unresolved_conflicts", []),
            "narrative_memory": narrative_memory,
            "emotional_state": self._infer_emotional_state(previous_scenes),
        }

    def _fetch_category(
        self,
        client,
        story: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        category_id = (story or {}).get("category_id")
        if not category_id:
            return None
        try:
            return self._single(
                client.table("categories").select("*").eq("id", category_id).limit(1).execute().data
            )
        except Exception:
            return None

    def _fetch_decisions(self, client, scene_ids: list[str]) -> list[dict[str, Any]]:
        if not scene_ids:
            return []
        response = (
            client.table("decisions")
            .select("*")
            .in_("scene_id", scene_ids)
            .order("decision_order")
            .execute()
        )
        return response.data or []

    def _fetch_progress(self, client) -> dict[str, Any] | None:
        if not self.user_id:
            return None
        normalized_user_id = normalize_user_id(self.user_id)
        try:
            response = (
                client.table("user_progress")
                .select("*")
                .eq("story_id", self.story_id)
                .eq("user_id", normalized_user_id)
                .limit(1)
                .execute()
            )
            return self._single(response.data)
        except Exception as exc:
            return None

    def _fetch_narrative_memory(self, client) -> dict[str, Any]:
        memory = self._empty_memory()
        try:
            response = (
                client.table("ai_generation_logs")
                .select("response,created_at")
                .eq("story_id", self.story_id)
                .eq("content_type", "dynamic_scene")
                .order("created_at")
                .execute()
            )
        except Exception:
            response = None

        rows = response.data if response else []
        rows.extend(self._fetch_local_memory_rows())

        for row in rows:
            payload = self._parse_log_payload(row.get("response"))
            if not payload:
                continue
            for key in [
                "important_events",
                "character_states",
                "relationships",
                "inventory",
                "unresolved_conflicts",
            ]:
                memory[key] = self._merge_unique(memory[key], payload.get(key, []))
            emotional_tone = payload.get("emotional_tone") or payload.get("tone")
            if emotional_tone:
                memory["emotional_tone"] = str(emotional_tone)
        return memory

    def _fetch_local_memory_rows(self) -> list[dict[str, Any]]:
        try:
            if not MEMORY_FILE.exists():
                return []
            raw = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return []
        rows = raw.get(str(self.story_id), [])
        return rows if isinstance(rows, list) else []

    @staticmethod
    def _parse_log_payload(raw: Any) -> dict[str, Any] | None:
        if isinstance(raw, dict):
            return raw
        if not raw:
            return None
        try:
            return json.loads(str(raw))
        except json.JSONDecodeError:
            try:
                parsed = literal_eval(str(raw))
                return parsed if isinstance(parsed, dict) else None
            except (ValueError, SyntaxError):
                return None

    @staticmethod
    def _empty_memory() -> dict[str, Any]:
        return {
            "important_events": [],
            "character_states": [],
            "relationships": [],
            "inventory": [],
            "emotional_tone": "",
            "unresolved_conflicts": [],
        }

    @staticmethod
    def _merge_unique(*groups: list[Any]) -> list[str]:
        seen = set()
        merged = []
        for group in groups:
            for item in group or []:
                value = str(item).strip()
                if not value:
                    continue
                key = value.lower()
                if key in seen:
                    continue
                seen.add(key)
                merged.append(value)
        return merged[-24:]

    def _previous_scenes(self, scenes: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not self.current_scene_id:
            return scenes[-6:]
        selected = []
        for scene in scenes:
            selected.append(scene)
            if str(scene.get("id")) == str(self.current_scene_id):
                break
        return selected[-6:]

    def _current_scene(self, scenes: list[dict[str, Any]]) -> dict[str, Any] | None:
        if self.current_scene_id:
            for scene in scenes:
                if str(scene.get("id")) == str(self.current_scene_id):
                    return scene
        return scenes[-1] if scenes else None

    @staticmethod
    def _single(rows: list[dict[str, Any]] | None) -> dict[str, Any] | None:
        return rows[0] if rows else None

    @staticmethod
    def _infer_tone(story: dict[str, Any] | None, scenes: list[dict[str, Any]]) -> str:
        if story and story.get("description"):
            description = story["description"].lower()
            if any(word in description for word in ["misterio", "desaparicion", "secreto"]):
                return "misterioso y cinematografico"
            if any(word in description for word in ["romance", "amor", "corazon"]):
                return "emocional y contemplativo"
        if scenes:
            return "coherente con las escenas anteriores"
        return "cinematografico"

    @staticmethod
    def _important_events(
        story: dict[str, Any] | None,
        scenes: list[dict[str, Any]],
        endings: list[dict[str, Any]],
    ) -> list[str]:
        events = []
        if story and story.get("description"):
            events.append(story["description"])
        events.extend(scene.get("title") or "Escena previa" for scene in scenes[-4:])
        events.extend(ending.get("title") or "Final posible" for ending in endings[:3])
        return events[:8]

    @staticmethod
    def _infer_relationships(characters: list[dict[str, Any]]) -> list[str]:
        return [
            f"{character.get('name', 'Personaje')}: {character.get('role') or 'rol narrativo desconocido'}"
            for character in characters[:6]
        ]

    @staticmethod
    def _infer_emotional_state(scenes: list[dict[str, Any]]) -> str:
        if not scenes:
            return "expectativa inicial"
        last_content = (scenes[-1].get("content") or "").lower()
        if any(word in last_content for word in ["miedo", "tembl", "oscuro", "silencio"]):
            return "tension y cautela"
        if any(word in last_content for word in ["descubre", "verdad", "recuerda"]):
            return "revelacion e incertidumbre"
        return "curiosidad sostenida"


def _now_response(content: str, content_type: str) -> AIResponse:
    return AIResponse(
        content=content.strip(),
        content_type=content_type,
        generated_at=datetime.now(),
    )


def _generate_with_gemini(prompt: str) -> str | None:
    if not settings.GEMINI_API_KEY or genai is None:
        return None

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
        )
        text = getattr(response, "text", None)
        return text.strip() if text else None
    except Exception:
        return None


def _extract_json(text: str | None) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None


def _context_text(context: dict[str, Any]) -> str:
    story = context.get("story") or {}
    category_name = context.get("category_name") or ""
    current_scene = context.get("current_scene") or {}
    scenes = context.get("previous_scenes") or []
    parts = [
        str(category_name),
        str(story.get("title") or ""),
        str(story.get("description") or ""),
        str(current_scene.get("title") or ""),
        str(current_scene.get("content") or ""),
        " ".join(str(scene.get("title") or "") for scene in scenes[-3:]),
        " ".join(str(scene.get("content") or "") for scene in scenes[-2:]),
    ]
    return " ".join(parts).lower()


def _as_list(value: Any, fallback: list[str] | None = None, limit: int = 12) -> list[str]:
    if value is None:
        return fallback or []
    if isinstance(value, list):
        items = value
    else:
        items = [value]
    cleaned = [str(item).strip() for item in items if str(item).strip()]
    return _dedupe_text_items(cleaned)[:limit] if cleaned else fallback or []


def _dedupe_text_items(items: list[Any], limit: int | None = None) -> list[str]:
    seen = set()
    cleaned = []
    for item in items or []:
        value = _clean_text(str(item or ""))
        if not value:
            continue
        key = _normalize_text(value)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(value)
        if limit and len(cleaned) >= limit:
            break
    return cleaned


def _clean_text(value: str, max_chars: int | None = None) -> str:
    text = str(value or "")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"([A-Za-zÁÉÍÓÚÑáéíóúñ])\1{4,}", r"\1\1", text)
    text = re.sub(r"\s+([,.;:!?])", r"\1", text)
    text = re.sub(r"([¿¡])\s+", r"\1", text)
    text = text.strip()
    if max_chars and len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0].rstrip(" ,.;:")
    return text


def _summarize_scene(scene: dict[str, Any], max_chars: int = 420) -> dict[str, str]:
    content = _clean_text(scene.get("content") or "", max_chars=max_chars)
    sentences = _split_sentences(content)
    summary = " ".join(sentences[:2]) if sentences else content
    return {
        "title": _clean_text(scene.get("title") or "Escena previa", max_chars=90),
        "summary": _clean_text(summary, max_chars=max_chars),
    }


def _split_sentences(text: str) -> list[str]:
    cleaned = _clean_text(text)
    if not cleaned:
        return []
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    return [_clean_text(part) for part in parts if _clean_text(part)]


def _previous_choice_texts(context: dict[str, Any]) -> list[str]:
    choices = []
    for decision in context.get("decisions_taken") or []:
        if isinstance(decision, dict):
            choices.append(decision.get("decisionText") or decision.get("decision_text") or decision.get("text"))
        else:
            choices.append(decision)
    for decision in context.get("available_decisions") or []:
        if isinstance(decision, dict):
            choices.append(decision.get("text") or decision.get("decision_text"))
    return _as_list(choices, limit=18)


def _scene_keywords(scene_content: str, context: dict[str, Any], limit: int = 10) -> list[str]:
    characters = [
        character.get("name")
        for character in context.get("known_characters") or []
        if isinstance(character, dict) and character.get("name")
    ]
    quoted = re.findall(r"[\"“”'‘’]([^\"“”'‘’]{3,48})[\"“”'‘’]", scene_content or "")
    capitalized = re.findall(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})?\b", scene_content or "")
    words = re.findall(r"\b[a-záéíóúñ]{5,}\b", (scene_content or "").lower())
    stopwords = {
        "entonces", "cuando", "donde", "habia", "habian", "parecia", "parecian",
        "porque", "aunque", "sobre", "entre", "desde", "hasta", "mismo", "misma",
        "antes", "despues", "podria", "podian", "silencio", "mirada", "palabra",
        "historia", "escena", "decision", "decisiones", "personaje", "personajes",
        "conocia", "conocer", "penso", "pensar", "dejo", "dejar",
    }
    ranked_words = []
    for word in words:
        if word in stopwords:
            continue
        if words.count(word) > 1 or len(word) >= 5:
            ranked_words.append(word)

    candidates = [*characters, *quoted, *capitalized, *ranked_words]
    seen = set()
    keywords = []
    for candidate in candidates:
        value = str(candidate or "").strip(" .,:;!¿?¡")
        if len(value) < 3:
            continue
        key = _normalize_text(value)
        if not key or key in seen:
            continue
        seen.add(key)
        keywords.append(value)
        if len(keywords) >= limit:
            break
    return keywords


def _fallback_choices_from_scene(scene_content: str, context: dict[str, Any]) -> list[str]:
    genre_key = context.get("genre_key") or "general"
    keywords = _scene_keywords(scene_content, context, limit=6)
    primary = keywords[0] if keywords else "lo que acaba de pasar"
    secondary = keywords[1] if len(keywords) > 1 else primary
    third = keywords[2] if len(keywords) > 2 else secondary

    patterns = {
        "romance": [
            f"Hablar con sinceridad sobre {primary}",
            f"Acercarse a {secondary} sin ocultar la duda",
            f"Responder al gesto de {third} con cuidado",
        ],
        "horror": [
            f"Alejarse de {primary} sin hacer ruido",
            f"Investigar {secondary} antes de que sea tarde",
            f"Protegerse usando {third}",
        ],
        "scifi": [
            f"Analizar {primary} desde el sistema",
            f"Rastrear el origen de {secondary}",
            f"Reconfigurar el protocolo ligado a {third}",
        ],
        "fantasy": [
            f"Invocar ayuda frente a {primary}",
            f"Seguir la señal de {secondary}",
            f"Proteger {third} antes de avanzar",
        ],
        "drama": [
            f"Hablar con honestidad sobre {primary}",
            f"Preguntar por {secondary} sin acusar",
            f"Aceptar lo que {third} revela",
        ],
        "mystery": [
            f"Revisar la pista de {primary}",
            f"Preguntar por {secondary} con cautela",
            f"Conectar {third} con el secreto",
        ],
        "general": [
            f"Examinar {primary} antes de decidir",
            f"Hablar sobre {secondary} con calma",
            f"Actuar a partir de {third}",
        ],
    }
    choices = patterns.get(genre_key, patterns["general"])
    deduped = _dedupe_choices(choices, context)
    if len(deduped) < 2:
        deduped.extend(
            [
                f"Volver sobre {primary} y cambiar el rumbo",
                f"Confrontar lo que {secondary} acaba de revelar",
            ]
        )
    return _dedupe_choices(deduped, {"decisions_taken": []})[:3]


def _postprocess_scene_content(scene_content: str, context: dict[str, Any]) -> str:
    text = _clean_text(scene_content)
    text = _remove_memory_artifacts(text)
    paragraphs = [paragraph.strip() for paragraph in text.split("\n\n") if paragraph.strip()]
    previous_sentences = _previous_sentence_keys(context)
    seen_sentences = set()
    final_paragraphs = []

    for paragraph in paragraphs:
        sentences = _split_sentences(paragraph)
        clean_sentences = []
        for sentence in sentences:
            sentence = _clean_text(sentence)
            if not sentence or _is_banned_sentence(sentence):
                continue
            key = _normalize_text(sentence)
            if key in seen_sentences or key in previous_sentences:
                continue
            seen_sentences.add(key)
            clean_sentences.append(sentence)
        if clean_sentences:
            final_paragraphs.append(" ".join(clean_sentences))
        if len(final_paragraphs) >= 3:
            break

    if not final_paragraphs:
        fallback = _dynamic_fallback(context)
        return _clean_text(fallback["scene_content"], max_chars=1800)

    processed = "\n\n".join(final_paragraphs[:3])
    processed = _limit_repeated_abstractions(processed)
    return _clean_text(processed, max_chars=2200)


def _remove_memory_artifacts(text: str) -> str:
    lines = []
    banned_prefixes = (
        "important_events",
        "character_states",
        "relationships",
        "inventory",
        "unresolved_conflicts",
        "emotional_tone",
        "scene_content",
        "choices",
        "memoria narrativa",
        "eventos importantes",
    )
    for line in text.split("\n"):
        stripped = line.strip()
        if not stripped:
            lines.append("")
            continue
        normalized = _normalize_text(stripped[:80])
        if any(normalized.startswith(_normalize_text(prefix)) for prefix in banned_prefixes):
            continue
        if stripped.startswith(("{", "}", "[", "]")):
            continue
        lines.append(stripped)
    return "\n".join(lines)


def _previous_sentence_keys(context: dict[str, Any]) -> set[str]:
    keys = set()
    for scene in context.get("previous_scenes") or []:
        for sentence in _split_sentences(scene.get("content") or ""):
            if len(sentence) < 12:
                continue
            keys.add(_normalize_text(sentence))
    return keys


def _is_banned_sentence(sentence: str) -> bool:
    normalized = _normalize_text(sentence)
    banned = [
        "la historia cambia",
        "la escena cambio",
        "la historia parecia",
        "el lector",
        "la narrativa",
        "esta ruta narrativa",
        "decision elegida",
        "memoria narrativa",
    ]
    return any(phrase in normalized for phrase in banned)


def _limit_repeated_abstractions(text: str) -> str:
    sentences = _split_sentences(text)
    counters = {
        "silencio parecia": 0,
        "aire parecia": 0,
        "como si": 0,
        "algo parecido": 0,
    }
    kept = []
    for sentence in sentences:
        normalized = _normalize_text(sentence)
        skip = False
        for phrase in counters:
            if phrase in normalized:
                counters[phrase] += 1
                if counters[phrase] > 1:
                    skip = True
                    break
        if not skip:
            kept.append(sentence)

    paragraphs = []
    current = []
    for sentence in kept:
        current.append(sentence)
        if len(current) >= 3:
            paragraphs.append(" ".join(current))
            current = []
    if current:
        paragraphs.append(" ".join(current))
    return "\n\n".join(paragraphs[:3])


def _dedupe_choices(choices: list[str], context: dict[str, Any]) -> list[str]:
    previous = {_normalize_text(choice) for choice in _previous_choice_texts(context)}
    seen = set()
    cleaned = []
    for choice in choices:
        value = str(choice or "").strip().rstrip(".")
        key = _normalize_text(value)
        if not key or key in seen or key in previous:
            continue
        seen.add(key)
        cleaned.append(value)
    return cleaned


def _narrative_brief(context: dict[str, Any]) -> dict[str, Any]:
    story = context.get("story") or {}
    current_scene = context.get("current_scene") or {}
    previous_scenes = context.get("previous_scenes") or []
    return {
        "title": _clean_text(story.get("title") or "Sin titulo", max_chars=120),
        "description": _clean_text(story.get("description") or "", max_chars=520),
        "category": context.get("category_name") or "Sin categoria",
        "genre_guidance": context.get("genre_guidance") or _genre_guidance(context.get("genre_key") or "general"),
        "tone": _clean_text(context.get("tone") or "", max_chars=120),
        "emotional_tone": _clean_text(context.get("emotional_tone") or context.get("emotional_state") or "", max_chars=160),
        "characters": _compact_characters(context.get("known_characters") or []),
        "current_scene": {
            "title": _clean_text(current_scene.get("title") or "Escena actual", max_chars=120),
            "content": _clean_text(current_scene.get("content") or "", max_chars=1800),
        },
        "last_3_scenes": [_summarize_scene(scene) for scene in previous_scenes[-3:]],
        "selected_decision": _clean_text(context.get("selected_decision") or "Continuar", max_chars=180),
        "decisions_taken": _compact_decisions(context.get("decisions_taken") or []),
        "previous_choices_to_avoid": _previous_choice_texts(context)[-10:],
        "important_events": _dedupe_text_items(context.get("important_events") or [], limit=8),
        "relationships": _dedupe_text_items(context.get("relationships") or [], limit=8),
        "inventory": _dedupe_text_items(context.get("inventory") or [], limit=8),
        "unresolved_conflicts": _dedupe_text_items(context.get("unresolved_conflicts") or [], limit=8),
    }


def _compact_characters(characters: list[dict[str, Any]]) -> list[dict[str, str]]:
    compacted = []
    for character in characters[:8]:
        if not isinstance(character, dict):
            continue
        compacted.append(
            {
                "name": _clean_text(character.get("name") or "Personaje", max_chars=80),
                "role": _clean_text(character.get("role") or "", max_chars=80),
                "description": _clean_text(character.get("description") or "", max_chars=220),
            }
        )
    return compacted


def _compact_decisions(decisions: list[Any]) -> list[str]:
    values = []
    for decision in decisions[-12:]:
        if isinstance(decision, dict):
            values.append(
                decision.get("decisionText")
                or decision.get("decision_text")
                or decision.get("text")
                or decision.get("decisionId")
            )
        else:
            values.append(decision)
    return _dedupe_text_items(values, limit=10)


def _compact_memory_for_prompt(context: dict[str, Any]) -> dict[str, Any]:
    memory = context.get("narrative_memory") or {}
    return {
        "important_events": _dedupe_text_items(
            [*memory.get("important_events", []), *context.get("important_events", [])],
            limit=10,
        ),
        "character_states": _dedupe_text_items(
            [*memory.get("character_states", []), *context.get("character_states", [])],
            limit=8,
        ),
        "relationships": _dedupe_text_items(
            [*memory.get("relationships", []), *context.get("relationships", [])],
            limit=8,
        ),
        "inventory": _dedupe_text_items(
            [*memory.get("inventory", []), *context.get("inventory", [])],
            limit=8,
        ),
        "unresolved_conflicts": _dedupe_text_items(
            [*memory.get("unresolved_conflicts", []), *context.get("unresolved_conflicts", [])],
            limit=8,
        ),
        "emotional_tone": _clean_text(
            memory.get("emotional_tone")
            or context.get("emotional_tone")
            or context.get("emotional_state")
            or "",
            max_chars=160,
        ),
    }


def _category_name(
    category: dict[str, Any] | None,
    story: dict[str, Any] | None,
) -> str:
    return str(
        (category or {}).get("name")
        or (story or {}).get("category_name")
        or (story or {}).get("category")
        or "Sin categoria"
    )


def _normalize_text(value: Any) -> str:
    normalized = (
        str(value or "")
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )
    return re.sub(r"[^a-z0-9]+", " ", normalized).strip()


def _genre_key(
    category: dict[str, Any] | None,
    story: dict[str, Any] | None,
) -> str:
    source = " ".join(
        [
            _category_name(category, story),
            str((story or {}).get("title") or ""),
            str((story or {}).get("description") or ""),
        ]
    )
    text = _normalize_text(source)
    if any(word in text for word in ["romance", "amor", "carta", "cartas", "enamor"]):
        return "romance"
    if any(word in text for word in ["terror", "horror", "miedo", "oscuro", "pesadilla"]):
        return "horror"
    if any(word in text for word in ["ciencia ficcion", "scifi", "sci fi", "futur", "senal", "tecnolog"]):
        return "scifi"
    if any(word in text for word in ["fantasia", "fantasy", "magia", "reino", "criatura"]):
        return "fantasy"
    if any(word in text for word in ["drama", "familia", "duelo", "conflicto", "personal"]):
        return "drama"
    if any(word in text for word in ["misterio", "mystery", "secreto", "sospech", "investig"]):
        return "mystery"
    return "general"


def _genre_guidance(genre_key: str) -> str:
    guidance = {
        "romance": (
            "Romance: decisiones emocionales, cartas, confesiones, dudas, encuentros, "
            "conversaciones honestas, distancia afectiva y pequenos gestos intimos. "
            "Evita sombras, golpes, criaturas o supervivencia salvo que la escena ya lo pida."
        ),
        "horror": (
            "Terror: decisiones de supervivencia, huida, esconderse, investigar una amenaza "
            "o proteger a alguien. El miedo debe nacer de la escena, no de objetos aleatorios."
        ),
        "scifi": (
            "Ciencia ficcion: decisiones sobre tecnologia, sistemas, senales, exploracion, "
            "protocolos, dilemas futuristas y consecuencias de descubrimientos cientificos."
        ),
        "fantasy": (
            "Fantasia: decisiones sobre magia, criaturas, juramentos, objetos misticos, "
            "caminos peligrosos, alianzas y reglas del mundo fantastico."
        ),
        "drama": (
            "Drama: decisiones personales, conversaciones dificiles, conflictos familiares, "
            "culpa, reparacion, silencio, perdon y consecuencias emocionales."
        ),
        "mystery": (
            "Misterio: decisiones sobre pistas, sospechosos, investigacion, secretos, "
            "coartadas, documentos y revelaciones parciales."
        ),
        "general": (
            "General: decisiones coherentes con la escena actual, centradas en personajes, "
            "conflicto y consecuencias inmediatas."
        ),
    }
    return guidance.get(genre_key, guidance["general"])


def save_narrative_memory(story_id: str, context: dict[str, Any], generated: dict[str, Any]) -> None:
    prompt = json.dumps(context, ensure_ascii=False, default=str)
    response = json.dumps(generated, ensure_ascii=False, default=str)
    row = {
        "content_type": "dynamic_scene",
        "prompt": prompt,
        "response": response,
        "story_id": story_id,
        "approved": True,
    }

    try:
        get_supabase_admin_client().table("ai_generation_logs").insert(row).execute()
        return
    except Exception:
        _save_local_narrative_memory(story_id, response)


def _save_local_narrative_memory(story_id: str, response: str) -> None:
    try:
        MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        if MEMORY_FILE.exists():
            raw = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        else:
            raw = {}
    except (OSError, json.JSONDecodeError):
        raw = {}

    story_rows = raw.get(str(story_id), [])
    if not isinstance(story_rows, list):
        story_rows = []
    story_rows.append(
        {
            "response": response,
            "created_at": datetime.now().isoformat(),
        }
    )
    raw[str(story_id)] = story_rows[-80:]

    try:
        MEMORY_FILE.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
    except OSError:
        pass


def _dynamic_fallback(context: dict[str, Any]) -> dict[str, Any]:
    tone = context.get("tone") or "cinematografico"
    genre_key = context.get("genre_key") or "general"
    story = context.get("story") or {}
    current_scene = context.get("current_scene") or {}
    selected = str(context.get("selected_decision") or "continuar").strip()
    memory = context.get("narrative_memory") or {}
    title = story.get("title") or "esta historia"
    scene_hint = (current_scene.get("content") or story.get("description") or "").strip()
    scene_hint = scene_hint[:240] if scene_hint else "lo que acaba de ocurrir"

    if genre_key == "romance":
        scene_content = (
            f"{selected[:1].upper() + selected[1:].lower()} dejo una vibracion suave en el pecho, "
            f"como si {title} hubiera encontrado por fin una frase que no se atrevia a decir. "
            "Todo se movio en gestos pequenos: una mirada que se sostuvo un segundo mas, "
            "una mano que dudo antes de apartarse, una palabra guardada al borde de los labios.\n\n"
            f"Lo ocurrido antes seguia ahi, latiendo bajo la superficie: {scene_hint}. "
            "Nada parecia resuelto, pero la distancia entre los personajes ya no era la misma. "
            "Habia ternura, miedo a equivocarse y esa clase de silencio que puede convertirse "
            "en despedida o en comienzo.\n\n"
            "Cuando llego el momento de responder, habia tres caminos reales: decir la verdad, "
            "cuidar la espera o buscar una prueba concreta de lo que ninguno habia dicho todavia."
        )
        fallback_events = [
            "Los sentimientos entre los personajes quedaron mas expuestos.",
            "La distancia emocional se volvio una decision pendiente.",
        ]
        fallback_inventory = ["carta, recuerdo o gesto significativo"]
        fallback_conflicts = [
            "Decidir si confesar lo que siente o protegerse del rechazo.",
            "Descubrir si el afecto es correspondido.",
        ]
    elif genre_key == "scifi":
        scene_content = (
            f"{selected[:1].upper() + selected[1:].lower()} hizo que el sistema respondiera con un pulso breve, casi "
            "imperceptible. Las lecturas cambiaron en cascada y lo que parecia una anomalia "
            "aislada empezo a dibujar un patron mas amplio.\n\n"
            f"El registro previo seguia abierto en la memoria de la mision: {scene_hint}. "
            "Cada dato nuevo traia una promesa y una amenaza. Si interpretaban mal la senal, "
            "podian perder la unica ruta de regreso; si la ignoraban, quiza dejarian escapar "
            "la primera respuesta real del otro lado.\n\n"
            "La consola pidio una instruccion. No habia tiempo para certezas, solo para elegir "
            "que clase de riesgo estaban dispuestos a asumir."
        )
        fallback_events = ["Una senal o sistema revelo un patron nuevo."]
        fallback_inventory = ["registro de datos inestable"]
        fallback_conflicts = ["Decidir entre seguridad tecnica y descubrimiento."]
    elif genre_key == "fantasy":
        scene_content = (
            f"{selected[:1].upper() + selected[1:].lower()} desperto una respuesta en el mundo, sutil "
            "pero antigua. El aire parecio inclinarse hacia los personajes, como si una regla "
            "olvidada acabara de ser pronunciada sin palabras.\n\n"
            f"Lo vivido antes seguia marcando el camino: {scene_hint}. Entre la duda y el "
            "asombro, cada objeto parecia guardar un juramento, cada sendero una deuda, cada "
            "silencio el nombre de algo que aun no se habia mostrado.\n\n"
            "La magia no ofrecio una respuesta clara. Ofrecio puertas, consecuencias y una "
            "advertencia: nada concedido por ese lugar seria gratuito."
        )
        fallback_events = ["Una fuerza antigua reacciono a la decision tomada."]
        fallback_inventory = ["senal mistica o objeto antiguo"]
        fallback_conflicts = ["Entender el precio de usar la magia."]
    elif genre_key == "drama":
        scene_content = (
            f"Despues de {selected.lower()}, nadie supo que decir de inmediato. Lo dificil "
            "no era encontrar palabras, sino elegir cuales no harian mas dano.\n\n"
            f"La escena cargaba con todo lo anterior: {scene_hint}. En ese peso habia culpa, "
            "orgullo, cansancio y una necesidad casi fisica de que alguien dijera la verdad "
            "sin convertirla en acusacion.\n\n"
            "La siguiente decision no prometia resolverlo todo. Pero podia abrir una grieta "
            "por donde entrara algo parecido a la honestidad."
        )
        fallback_events = ["Un conflicto personal quedo mas expuesto."]
        fallback_inventory = []
        fallback_conflicts = ["Elegir entre orgullo, silencio y reconciliacion."]
    elif genre_key == "horror":
        scene_content = (
            f"{selected[:1].upper() + selected[1:].lower()} hizo que el peligro pareciera mas cercano. "
            "No hizo falta verlo; basto con sentir como el aire se enfriaba y cada sonido "
            "ganaba una intencion propia.\n\n"
            f"Lo anterior seguia persiguiendo la escena: {scene_hint}. La amenaza no era "
            "abstracta. Estaba en la forma en que el espacio respondia, en lo que se ocultaba "
            "fuera de la vista, en la certeza de que quedarse quieto tambien era una eleccion.\n\n"
            "Habia que moverse, pero cualquier movimiento podia revelar demasiado."
        )
        fallback_events = ["La amenaza se acerco tras la decision tomada."]
        fallback_inventory = ["objeto util para sobrevivir"]
        fallback_conflicts = ["Sobrevivir sin entender aun la amenaza."]
    elif genre_key == "mystery":
        scene_content = (
            f"Al decidir {selected.lower()}, una pieza que parecia secundaria empezo a "
            "encajar con demasiada precision. Nadie dijo nada al principio; el silencio "
            "dejo espacio para que la sospecha se acomodara entre los detalles.\n\n"
            f"Lo anterior seguia ofreciendo pistas incompletas: {scene_hint}. Una frase, "
            "un gesto o una ausencia pesaban mas que cualquier explicacion directa. Lo "
            "importante no era solo descubrir que habia ocurrido, sino entender quien se "
            "beneficiaba de que siguiera oculto.\n\n"
            "La investigacion podia avanzar, pero cada respuesta prometia abrir otro secreto."
        )
        fallback_events = ["Una pista previa adquirio un nuevo significado."]
        fallback_inventory = ["pista o documento ambiguo"]
        fallback_conflicts = ["Descubrir quien oculta la verdad y por que."]
    else:
        scene_content = (
            f"{selected[:1].upper() + selected[1:].lower()} cambio el equilibrio de la escena. Lo que "
            "antes parecia una posibilidad lejana se volvio inmediato, concreto, imposible "
            "de ignorar.\n\n"
            f"Todo seguia conectado con lo ocurrido antes: {scene_hint}. Los personajes "
            "entendieron que el siguiente paso no podia ser casual; tenia que revelar una "
            "prioridad, un miedo o una verdad que habia permanecido oculta.\n\n"
            "La situacion quedo abierta, esperando una nueva eleccion capaz de inclinar el "
            "rumbo sin traicionar lo que ya habia pasado."
        )
        fallback_events = ["La decision tomada abrio una nueva consecuencia."]
        fallback_inventory = []
        fallback_conflicts = ["Elegir el siguiente paso sin romper la continuidad."]

    return {
        "scene_content": scene_content,
        "choices": _fallback_choices_from_scene(scene_content, context),
        "tone": tone,
        "important_events": _as_list(
            memory.get("important_events") or context.get("important_events"),
            fallback_events,
        ),
        "character_states": _as_list(
            memory.get("character_states"),
            ["El personaje principal esta alerta, cansado y decidido a no retroceder."],
        ),
        "relationships": _as_list(memory.get("relationships") or context.get("relationships")),
        "inventory": _as_list(memory.get("inventory"), fallback_inventory),
        "emotional_tone": memory.get("emotional_tone") or context.get("emotional_tone") or tone,
        "unresolved_conflicts": _as_list(
            memory.get("unresolved_conflicts"),
            fallback_conflicts,
        ),
    }


def generate_dynamic_scene(context: dict[str, Any]) -> dict[str, Any]:
    story = context.get("story") or {}
    category_name = context.get("category_name") or "Sin categoria"
    genre_guidance = context.get("genre_guidance") or _genre_guidance("general")
    current_scene = context.get("current_scene") or {}
    narrative_brief = _narrative_brief(context)
    compact_memory = _compact_memory_for_prompt(context)
    prompt = f"""
{SAFETY_INSTRUCTIONS}

Actua como novelista literario y continua la escena desde dentro de la narracion.
No expliques la decision elegida: conviertela en accion, ambiente y consecuencia
dramatica. La continuacion debe sentirse como una escena real de una novela moderna:
natural, concreta, emocional y fluida.

Datos narrativos obligatorios:
- Titulo: {story.get("title") or "Sin titulo"}
- Categoria real: {category_name}
- Guia de genero: {genre_guidance}
- Decision elegida: {context.get("selected_decision") or "Continuar"}
- Escena actual titulo: {current_scene.get("title") or "Escena actual"}
- Escena actual contenido: {current_scene.get("content") or ""}

DOSSIER NARRATIVO PRIORITARIO:
{json.dumps(narrative_brief, ensure_ascii=False, default=str)}

MEMORIA COMPACTA LIMPIA:
{json.dumps(compact_memory, ensure_ascii=False, default=str)}

Debes devolver exclusivamente JSON valido con esta forma:
{{
  "scene_content": "...",
  "choices": ["...", "...", "..."],
  "tone": "...",
  "important_events": ["..."],
  "character_states": ["..."],
  "relationships": ["..."],
  "inventory": ["..."],
  "emotional_tone": "...",
  "unresolved_conflicts": ["..."]
}}

Reglas:
- Continua directamente la ultima escena; no resumas, no expliques y no anuncies intenciones.
- Mantener el punto de vista, los nombres propios y las relaciones ya establecidas.
- La primera frase debe continuar una accion, emocion o imagen concreta de la escena actual.
- NO copies ni parafrasees escenas anteriores completas. Usa solo consecuencias y detalles necesarios.
- NO pegues memoria narrativa, listas, resumenes ni eventos dentro de scene_content.
- Respeta estrictamente la categoria real y la guia de genero.
- El texto debe usar detalles concretos del dossier: personajes, objetos, lugares, frases, heridas, secretos, cartas o conflictos abiertos.
- No mezcles terror/misterio con romance, drama, fantasia o ciencia ficcion salvo que la escena actual ya contenga esa amenaza.
- Si la categoria es romance, enfoca choices en emociones, cartas, confesiones, dudas, encuentros, conversacion o distancia.
- Si la categoria es terror, enfoca choices en supervivencia, huida, investigar o esconderse.
- Si la categoria es ciencia ficcion, enfoca choices en tecnologia, sistemas, senales, exploracion o dilemas futuristas.
- Si la categoria es fantasia, enfoca choices en magia, criaturas, objetos misticos, juramentos o caminos.
- Si la categoria es drama, enfoca choices en conversaciones, decisiones personales y conflictos familiares.
- Si la categoria es misterio, enfoca choices en pistas, sospechosos, investigacion, secretos o documentos.
- No uses frases como "la decision de...", "el lector", "la historia", "la narrativa" o "la escena".
- No digas "la historia cambia", "la escena cambio", "la historia parecia", "el destino cambio", ni expliques la estructura interactiva.
- Evita repetir muletillas como "el silencio parecia", "el aire parecia", "algo parecido a", "como si" mas de una vez.
- Mantener personajes, ambiente, conflicto, tono, relaciones y estado emocional.
- Usa la memoria narrativa acumulada para recordar eventos, objetos, secretos, relaciones y consecuencias antiguas.
- Haz callbacks sutiles a eventos pasados cuando aporten tension o significado.
- No contradigas inventario, relaciones, heridas, secretos ni conflictos pendientes.
- Actualiza la memoria con consecuencias nuevas, estados emocionales y conflictos abiertos.
- Escribir maximo 3 parrafos.
- Maximo una metafora fuerte en toda la escena.
- Usar acciones concretas, dialogo ocasional y reacciones visibles de los personajes.
- Menos abstraccion: muestra gestos, objetos, lugares y decisiones pequenas.
- Cada continuacion debe: mostrar algo nuevo, avanzar la relacion/conflicto, introducir una reaccion concreta y terminar en un punto natural para decidir.
- Crear tension natural sin sonar generico, abstracto o repetitivo.
- Avanzar la trama con una consecuencia nueva de la ultima decision elegida.
- La ultima imagen debe abrir una nueva encrucijada dramatica.
- Incluye choices preliminares, pero primero prioriza que scene_content sea rico en detalles concretos.
- Las choices finales se regeneraran despues leyendo scene_content; aun asi evita opciones genericas reutilizables.
- No uses markdown.
- No incluyas texto fuera del JSON.
"""
    generated = _extract_json(_generate_with_gemini(prompt))
    if not generated:
        fallback = _dynamic_fallback(context)
        fallback["scene_content"] = _postprocess_scene_content(fallback["scene_content"], context)
        return fallback

    fallback = _dynamic_fallback(context)
    scene_content = str(generated.get("scene_content") or "").strip() or fallback["scene_content"]
    scene_content = _postprocess_scene_content(scene_content, context)
    choices = _generate_choices_for_scene(
        context=context,
        scene_content=scene_content,
        generated_memory=generated,
    )
    if len(choices) < 3:
        choices = fallback["choices"]

    return {
        "scene_content": scene_content,
        "choices": choices,
        "tone": str(generated.get("tone") or context.get("tone") or "cinematografico"),
        "important_events": _as_list(
            generated.get("important_events"),
            fallback["important_events"],
        ),
        "character_states": _as_list(
            generated.get("character_states"),
            fallback["character_states"],
        ),
        "relationships": _as_list(generated.get("relationships"), fallback["relationships"]),
        "inventory": _as_list(generated.get("inventory"), fallback["inventory"]),
        "emotional_tone": str(
            generated.get("emotional_tone")
            or generated.get("tone")
            or fallback["emotional_tone"]
        ),
        "unresolved_conflicts": _as_list(
            generated.get("unresolved_conflicts"),
            fallback["unresolved_conflicts"],
        ),
    }


def _generate_choices_for_scene(
    context: dict[str, Any],
    scene_content: str,
    generated_memory: dict[str, Any] | None = None,
) -> list[str]:
    story = context.get("story") or {}
    category_name = context.get("category_name") or "Sin categoria"
    genre_key = context.get("genre_key") or "general"
    genre_guidance = context.get("genre_guidance") or _genre_guidance(genre_key)
    characters = context.get("known_characters") or []
    narrative_brief = _narrative_brief(context)
    important_events = _as_list(
        (generated_memory or {}).get("important_events") or context.get("important_events"),
        limit=10,
    )
    previous_choices = _previous_choice_texts(context)
    keywords = _scene_keywords(scene_content, context, limit=12)

    prompt = f"""
{SAFETY_INSTRUCTIONS}

Genera SOLO decisiones para la escena nueva. Lee primero la escena exacta y
propone opciones que dependan de sus elementos concretos: nombres, objetos,
lugares, cartas, frases, conflictos, emociones o revelaciones.

Datos:
- Titulo: {story.get("title") or "Sin titulo"}
- Categoria real: {category_name}
- Guia de genero: {genre_guidance}
- Personajes detectados: {json.dumps(characters, ensure_ascii=False, default=str)}
- Ultima decision elegida: {context.get("selected_decision") or "Continuar"}
- Eventos importantes previos: {json.dumps(important_events, ensure_ascii=False)}
- Decisiones previas a evitar: {json.dumps(previous_choices, ensure_ascii=False)}
- Elementos concretos detectados en la escena: {json.dumps(keywords, ensure_ascii=False)}
- Dossier narrativo: {json.dumps(narrative_brief, ensure_ascii=False, default=str)}

Escena nueva completa:
{scene_content}

Devuelve exclusivamente JSON valido:
{{
  "choices": [
    "Decision concreta basada en algo que acaba de pasar",
    "Otra decision distinta con consecuencia clara",
    "Otra decision distinta y coherente"
  ]
}}

Reglas estrictas:
- Cada choice debe referirse a al menos un elemento concreto de la escena nueva.
- Usa nombres propios, objetos, lugares, cartas, frases o conflictos aparecidos en la escena cuando existan.
- Cada choice debe abrir una consecuencia diferente.
- No repitas decisiones anteriores ni reformules la misma decision con otras palabras.
- No uses choices genericas como "Buscar una senal", "Guardar silencio" o "Seguir la sombra" si la escena no lo justifica literalmente.
- No inventes terror, sombras, golpes, tecnologia o magia si no aparecen en la escena o en el genero.
- Mantener el genero y el tono emocional.
- Choices cortas, claras, narrativas y accionables.
- Evita verbos vagos sin objeto concreto: buscar, esperar, observar, continuar, avanzar, hablar, si no especifican que o con quien.
- No uses markdown ni texto fuera del JSON.
"""
    generated = _extract_json(_generate_with_gemini(prompt))
    if not generated:
        return _fallback_choices_from_scene(scene_content, context)

    choices = _filter_scene_choices(
        _as_list(generated.get("choices"), limit=5),
        scene_content,
        context,
    )
    if len(choices) < 3:
        repaired = _repair_choices_for_scene(
            context=context,
            scene_content=scene_content,
            rejected_choices=_as_list(generated.get("choices"), limit=5),
            existing_choices=choices,
        )
        choices = _filter_scene_choices([*choices, *repaired], scene_content, context)

    if len(choices) < 3:
        choices = _filter_scene_choices(
            [*choices, *_fallback_choices_from_scene(scene_content, context)],
            scene_content,
            context,
        )

    return choices[:3]


def generate_dynamic_choices(context: dict[str, Any]) -> dict[str, Any]:
    current_scene = context.get("current_scene") or {}
    scene_content = current_scene.get("content") or _context_text(context)
    fallback = _dynamic_fallback(context)
    choices = _generate_choices_for_scene(context, scene_content)
    if len(choices) < 3:
        choices = fallback["choices"]

    return {
        "choices": choices,
        "tone": str(context.get("tone") or fallback["tone"] or "cinematografico"),
        "important_events": context.get("important_events", []) or fallback["important_events"],
    }


def _filter_scene_choices(
    choices: list[str],
    scene_content: str,
    context: dict[str, Any],
) -> list[str]:
    genre_key = context.get("genre_key") or "general"
    deduped = _dedupe_choices(choices, context)
    filtered = []
    seen_consequence_roots = set()
    for choice in deduped:
        if not _choices_fit_genre([choice], genre_key):
            continue
        if _choice_is_generic(choice, scene_content, context):
            continue
        if not _choice_mentions_scene_element(choice, scene_content, context):
            continue
        consequence_root = _choice_consequence_root(choice)
        if consequence_root in seen_consequence_roots:
            continue
        seen_consequence_roots.add(consequence_root)
        filtered.append(choice)
    return filtered[:3]


def _repair_choices_for_scene(
    context: dict[str, Any],
    scene_content: str,
    rejected_choices: list[str],
    existing_choices: list[str],
) -> list[str]:
    story = context.get("story") or {}
    genre_key = context.get("genre_key") or "general"
    keywords = _scene_keywords(scene_content, context, limit=14)
    prompt = f"""
{SAFETY_INSTRUCTIONS}

Regenera decisiones porque las anteriores fueron genericas o poco conectadas.

Titulo: {story.get("title") or "Sin titulo"}
Categoria: {context.get("category_name") or "Sin categoria"}
Guia de genero: {context.get("genre_guidance") or _genre_guidance(genre_key)}
Ultima decision elegida: {context.get("selected_decision") or "Continuar"}
Personajes y elementos obligatorios: {json.dumps(keywords, ensure_ascii=False)}
Decisiones anteriores a evitar: {json.dumps(_previous_choice_texts(context), ensure_ascii=False)}
Choices rechazadas: {json.dumps(rejected_choices, ensure_ascii=False)}
Choices ya aceptadas, no repetir: {json.dumps(existing_choices, ensure_ascii=False)}

Escena nueva:
{scene_content}

Devuelve solo JSON:
{{"choices":["...","...","..."]}}

Reglas:
- Exactamente 3 choices si es posible.
- Cada choice debe mencionar un elemento concreto de la escena nueva.
- Cada choice abre una consecuencia distinta.
- No uses opciones genericas ni reutilizables.
- No uses markdown ni explicaciones.
"""
    generated = _extract_json(_generate_with_gemini(prompt))
    return _as_list((generated or {}).get("choices"), limit=5)


def _choices_fit_genre(choices: list[str], genre_key: str) -> bool:
    joined = _normalize_text(" ".join(choices))
    forbidden = {
        "romance": [
            "sombra",
            "golpe",
            "golpes",
            "huir",
            "esconder",
            "criatura",
            "amenaza",
            "sangre",
            "pared",
            "objeto desconocido",
        ],
        "drama": ["criatura", "magia", "hechizo", "sombra", "golpes", "sistema", "senal alien"],
        "scifi": ["carta de amor", "hechizo", "criatura mistica"],
        "fantasy": ["protocolo", "sistema principal", "consola", "senal digital"],
    }
    blocked = forbidden.get(genre_key, [])
    return not any(term in joined for term in blocked)


def _choice_is_generic(
    choice: str,
    scene_content: str,
    context: dict[str, Any],
) -> bool:
    normalized = _normalize_text(choice)
    generic_exact = {
        "buscar una senal",
        "guardar silencio",
        "seguir la sombra",
        "continuar adelante",
        "observar mejor",
        "tomar distancia",
        "seguir adelante",
        "esperar",
        "huir",
        "investigar",
        "hablar",
    }
    if normalized in generic_exact:
        return True

    vague_starts = ["buscar", "esperar", "observar", "continuar", "avanzar", "hablar", "investigar"]
    words = normalized.split()
    if len(words) <= 3 and words and words[0] in vague_starts:
        return True

    # Generic if it avoids every concrete noun/person detected from the scene.
    return not _choice_mentions_scene_element(choice, scene_content, context)


def _choice_mentions_scene_element(
    choice: str,
    scene_content: str,
    context: dict[str, Any],
) -> bool:
    keyword_roots = {
        _normalize_text(keyword).split(" ")[0]
        for keyword in _scene_keywords(scene_content, context, limit=18)
    }
    keyword_roots = {keyword for keyword in keyword_roots if len(keyword) >= 4}
    if not keyword_roots:
        return True
    normalized_choice = _normalize_text(choice)
    return any(root in normalized_choice for root in keyword_roots)


def _choice_consequence_root(choice: str) -> str:
    normalized = _normalize_text(choice)
    words = [
        word for word in normalized.split()
        if word not in {"con", "sobre", "para", "antes", "despues", "desde", "hasta", "sin"}
    ]
    return " ".join(words[:3])


def _choices_are_scene_specific(
    choices: list[str],
    scene_content: str,
    context: dict[str, Any],
) -> bool:
    generic_patterns = [
        "buscar una senal",
        "guardar silencio",
        "seguir la sombra",
        "continuar adelante",
        "observar mejor",
        "tomar distancia",
    ]
    normalized_choices = [_normalize_text(choice) for choice in choices]
    if any(choice in generic_patterns for choice in normalized_choices):
        return False

    keyword_roots = {
        _normalize_text(keyword).split(" ")[0]
        for keyword in _scene_keywords(scene_content, context, limit=14)
    }
    keyword_roots = {keyword for keyword in keyword_roots if len(keyword) >= 4}
    if not keyword_roots:
        return True

    specific_count = 0
    for choice in normalized_choices:
        if any(root in choice for root in keyword_roots):
            specific_count += 1

    return specific_count >= min(2, len(choices))


def generate_scene_fallback(data: AIGenerateScene) -> AIResponse:
    tone = data.tone or "neutral"
    content = (
        f"El tono se mantiene {tone}, contenido y atento a las consecuencias de lo anterior. "
        "El personaje reconoce un detalle que habia pasado inadvertido y entiende que la "
        "situacion ya no puede resolverse con una respuesta facil.\n\n"
        "Ese hallazgo altera la relacion con el lugar y con quienes lo acompanan. Una frase, "
        "un objeto o una mirada bastan para abrir una duda concreta, todavia pequena, pero "
        "imposible de ignorar.\n\n"
        "Antes de avanzar, queda claro que el siguiente paso debe elegirse con cuidado: "
        "acercarse, preguntar o tomar distancia cambiara lo que ocurra despues."
    )
    return _now_response(content, "scene")


def generate_ending_fallback(data: AIGenerateEnding) -> AIResponse:
    decisions_count = len(data.decisions_path or [])
    content = (
        f"Despues de {decisions_count} decisiones, el cierre recoge las consecuencias del camino "
        "sin borrar sus costos. El conflicto principal encuentra una resolucion clara, aunque "
        "no necesariamente simple.\n\n"
        "La ultima imagen conserva el tono de la historia y deja al personaje frente a lo que "
        "eligio ser cuando ya no quedaban atajos."
    )
    return _now_response(content, "ending")


def generate_character_fallback(data: AIGenerateCharacter) -> AIResponse:
    role = data.role or "personaje"
    content = (
        f"Rol: {role}. Mara Voss carga una motivacion clara y un secreto que condiciona sus "
        "decisiones. Su voz es sobria, directa y capaz de sostener conflictos emocionales "
        "sin romper el tono del relato."
    )
    return _now_response(content, "character")


def generate_scene(data: AIGenerateScene) -> AIResponse:
    decisions = "\n".join(f"- {decision}" for decision in data.previous_decisions or [])
    prompt = f"""
{SAFETY_INSTRUCTIONS}

Genera una escena narrativa para Novelle.

Datos:
- story_id: {data.story_id}
- tono: {data.tone or "neutral"}
- contexto: {data.context}
- decisiones previas:
{decisions or "- Ninguna"}

Requisitos:
- 2 a 3 parrafos.
- Mantener continuidad con el contexto.
- No incluyas opciones de decision al final.
- No uses markdown ni encabezados.
"""
    content = _generate_with_gemini(prompt)
    return _now_response(content, "scene") if content else generate_scene_fallback(data)


def generate_ending(data: AIGenerateEnding) -> AIResponse:
    decisions = "\n".join(f"- {decision}" for decision in data.decisions_path or [])
    prompt = f"""
{SAFETY_INSTRUCTIONS}

Genera un final narrativo para una historia interactiva de Novelle.

Datos:
- contexto: {data.context}
- ruta de decisiones:
{decisions or "- Sin decisiones registradas"}

Requisitos:
- 2 a 3 parrafos.
- Cerrar el conflicto de forma emocional y coherente.
- Reflejar consecuencias de las decisiones.
- No uses markdown ni encabezados.
"""
    content = _generate_with_gemini(prompt)
    return _now_response(content, "ending") if content else generate_ending_fallback(data)


def generate_character(data: AIGenerateCharacter) -> AIResponse:
    prompt = f"""
{SAFETY_INSTRUCTIONS}

Genera un personaje para una historia interactiva de Novelle.

Datos:
- rol: {data.role}
- contexto: {data.context}

Requisitos:
- Incluir nombre, edad aproximada, motivacion, conflicto interno y funcion narrativa.
- Tono sobrio, cinematografico y editorial.
- 1 a 3 parrafos.
- No uses markdown ni encabezados.
"""
    content = _generate_with_gemini(prompt)
    return _now_response(content, "character") if content else generate_character_fallback(data)
