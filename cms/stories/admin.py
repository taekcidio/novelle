# ═══════════════════════════════════════
# NOVELLE CMS — Admin Configuration
# ═══════════════════════════════════════

from django.contrib import admin
from .models import Category, Story, Character, Scene, Decision, Ending, AIContentLog


# ─── Inlines ─────────────────────────
class SceneInline(admin.TabularInline):
    model = Scene
    extra = 1
    fields = ("title", "order", "is_decision_point")
    ordering = ("order",)


class DecisionInline(admin.TabularInline):
    model = Decision
    extra = 1
    fields = ("text", "leads_to_scene", "leads_to_ending", "hint", "order")
    ordering = ("order",)


class EndingInline(admin.StackedInline):
    model = Ending
    extra = 0
    fields = ("title", "ending_type", "content")


class CharacterInline(admin.TabularInline):
    model = Character
    extra = 0
    fields = ("name", "role", "description")


# ─── Admin Classes ───────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "story_count", "created_at")
    search_fields = ("name",)

    def story_count(self, obj):
        return obj.stories.count()
    story_count.short_description = "Historias"


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "category", "status", "rating", "readers", "featured", "scenes_count", "endings_count", "created_at")
    list_filter = ("status", "category", "featured")
    search_fields = ("title", "author", "description")
    list_editable = ("status", "featured")
    inlines = [CharacterInline, SceneInline, EndingInline]
    fieldsets = (
        ("Información General", {
            "fields": ("title", "description", "author", "category", "cover_image", "tags"),
        }),
        ("Estado", {
            "fields": ("status", "featured"),
        }),
        ("Métricas", {
            "fields": ("rating", "readers", "reading_time"),
        }),
    )


@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ("title", "story", "order", "is_decision_point", "decision_count")
    list_filter = ("story", "is_decision_point")
    search_fields = ("title", "content")
    inlines = [DecisionInline]

    def decision_count(self, obj):
        return obj.decisions.count()
    decision_count.short_description = "Decisiones"


@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ("name", "story", "role")
    list_filter = ("role", "story")
    search_fields = ("name", "description")


@admin.register(Ending)
class EndingAdmin(admin.ModelAdmin):
    list_display = ("title", "story", "ending_type", "created_at")
    list_filter = ("ending_type", "story")
    search_fields = ("title", "content")


@admin.register(AIContentLog)
class AIContentLogAdmin(admin.ModelAdmin):
    list_display = ("content_type", "story", "approved", "created_at")
    list_filter = ("content_type", "approved")
    search_fields = ("prompt", "response")
    list_editable = ("approved",)
    readonly_fields = ("prompt", "response", "created_at")
