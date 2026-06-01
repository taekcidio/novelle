from django.contrib import admin
from django.urls import path

admin.site.site_header = "Novelle CMS"
admin.site.site_title = "Novelle"
admin.site.index_title = "Panel de Administración"

urlpatterns = [
    path("admin/", admin.site.urls),
]
