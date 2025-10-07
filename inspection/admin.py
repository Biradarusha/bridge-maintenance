from django.contrib import admin
from django.utils.html import format_html
from .models import Project, Bridge, Observation, ObservationImage, SummaryStat


class ObservationImageInline(admin.TabularInline):
    model = ObservationImage
    extra = 1
    readonly_fields = ('image_preview', 'camera_capture')
    fields = (
        'image_preview',
        'camera_capture',
        'image',
        'caption',
        'image_type',
        'side',
        'timestamp',
        'latitude',
        'longitude',
        'location_name',   # ✅ new field
    )
    def image_preview(self, obj):
        """
        Show image preview with link to Google Maps
        """
        if obj.image:
            return format_html(
                '<a href="https://www.google.com/maps?q={},{}" target="_blank">'
                '<img src="{}" style="height:100px; border:1px solid #ccc;"/></a><br>'
                '<small>{}</small>',
                obj.latitude or 0,
                obj.longitude or 0,
                obj.image.url,
                obj.timestamp.strftime("%Y-%m-%d %H:%M:%S") if obj.timestamp else "",
            )
        return ""
    image_preview.short_description = "Preview"

    def camera_capture(self, obj=None):
        """
        Renders Capture button for JS
        """
        return format_html('<button type="button" class="open-camera-btn">📸 Capture Photo</button>')
    camera_capture.short_description = "Camera"

    class Media:
        js = (
            "https://unpkg.com/leaflet/dist/leaflet.js",
            "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
            "js/camera_capture.js",   # your static/js file
        )
        css = {
            "all": (
                "https://unpkg.com/leaflet/dist/leaflet.css",
                "css/style.css",   # your static/css file
            )
        }


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ('title', 'bridge', 'severity', 'side', 'created_at')
    inlines = [ObservationImageInline]


@admin.register(Bridge)
class BridgeAdmin(admin.ModelAdmin):
    list_display =  ('project', 'name', 'chainage_km', 'direction', 'inspection_date', 'structure_type', 'structure_no', 
        'rating', 'chainage_from', 'chainage_to', 'level', 'structure_id',
        'latitude', 'longitude'
    )

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'created_at')


@admin.register(SummaryStat)
class SummaryStatAdmin(admin.ModelAdmin):
    list_display = ('bridge', 'critical_total', 'moderate_total', 'cleaning_total', 'updated_at')
    readonly_fields = ('updated_at',)
