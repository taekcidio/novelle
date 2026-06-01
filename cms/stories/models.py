# ═══════════════════════════════════════
# NOVELLE CMS — Story Models
# ═══════════════════════════════════════

from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=10, blank=True, help_text="Emoji o código de ícono")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categorías"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Story(models.Model):
    STATUS_CHOICES = [
        ("draft", "Borrador"),
        ("review", "En revisión"),
        ("published", "Publicada"),
        ("archived", "Archivada"),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    author = models.CharField(max_length=100)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="stories")
    cover_image = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    rating = models.FloatField(default=0)
    readers = models.IntegerField(default=0)
    reading_time = models.CharField(max_length=20, blank=True)
    tags = models.CharField(max_length=500, blank=True, help_text="Tags separados por coma")
    featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Historias"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    @property
    def endings_count(self):
        return self.endings.count()

    @property
    def scenes_count(self):
        return self.scenes.count()


class Character(models.Model):
    ROLE_CHOICES = [
        ("protagonist", "Protagonista"),
        ("antagonist", "Antagonista"),
        ("secondary", "Secundario"),
        ("narrator", "Narrador"),
    ]

    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="characters")
    name = models.CharField(max_length=100)
    description = models.TextField()
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="secondary")
    image = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Personajes"

    def __str__(self):
        return f"{self.name} ({self.story.title})"


class Scene(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="scenes")
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.IntegerField(default=0)
    is_decision_point = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Escenas"
        ordering = ["story", "order"]

    def __str__(self):
        return f"{self.story.title} — {self.title}"


class Decision(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="decisions")
    text = models.CharField(max_length=300)
    leads_to_scene = models.ForeignKey(Scene, on_delete=models.SET_NULL, null=True, blank=True, related_name="incoming_decisions")
    leads_to_ending = models.ForeignKey("Ending", on_delete=models.SET_NULL, null=True, blank=True, related_name="incoming_decisions")
    hint = models.CharField(max_length=200, blank=True)
    consequence = models.TextField(blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        verbose_name_plural = "Decisiones"
        ordering = ["scene", "order"]

    def __str__(self):
        return f"{self.text[:50]}..."


class Ending(models.Model):
    TYPE_CHOICES = [
        ("hero", "Heroico"),
        ("dark", "Oscuro"),
        ("love", "Romántico"),
        ("twist", "Giro inesperado"),
        ("escape", "Escape"),
        ("revelation", "Revelación"),
        ("hope", "Esperanzador"),
        ("bittersweet", "Agridulce"),
        ("triumph", "Triunfo"),
        ("transformation", "Transformación"),
    ]

    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="endings")
    title = models.CharField(max_length=200)
    content = models.TextField()
    ending_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="hero")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Finales"

    def __str__(self):
        return f"{self.title} ({self.story.title})"


class AIContentLog(models.Model):
    CONTENT_TYPES = [
        ("scene", "Escena"),
        ("ending", "Final"),
        ("character", "Personaje"),
        ("dialogue", "Diálogo"),
    ]

    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES)
    prompt = models.TextField()
    response = models.TextField()
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name="ai_logs", null=True, blank=True)
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Registro de IA"
        verbose_name_plural = "Registros de IA"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.content_type}] {self.created_at.strftime('%Y-%m-%d %H:%M')}"
