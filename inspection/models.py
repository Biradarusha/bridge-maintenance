from django.db import models
from django.utils import timezone

class Project(models.Model):
    name = models.CharField(max_length=200)
    location = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.location}"


class Bridge(models.Model):
    RATING_CHOICES = [
        ('critical', 'Critical'),
        ('moderate', 'Moderate'),
        ('good', 'Good'),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    chainage_km = models.CharField(max_length=100)
    direction = models.CharField(max_length=200)
    inspection_date = models.DateField()
    structure_type = models.CharField(max_length=100)
    structure_no = models.CharField(max_length=50)
    rating = models.CharField(max_length=10, choices=RATING_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    chainage_from = models.CharField(max_length=50, blank=True, null=True)
    chainage_to = models.CharField(max_length=50, blank=True, null=True)
    level = models.CharField(max_length=50, blank=True, null=True)
    structure_id = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.chainage_km}"


class Observation(models.Model):
    SEVERITY_CHOICES = [
        ('critical', 'Critical'),
        ('moderate', 'Moderate'),
        ('cleaning', 'Cleaning Required'),
    ]
    SIDE_CHOICES = [
        ('lhs', 'LHS'),
        ('rhs', 'RHS'),
        ('both', 'Both'),
    ]
    bridge = models.ForeignKey(Bridge, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    side = models.CharField(max_length=10, choices=SIDE_CHOICES)
    map_coordinates = models.CharField(max_length=100, blank=True, null=True)
    map_image = models.ImageField(upload_to='map_images/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.bridge.name}"


class ObservationImage(models.Model):
    IMAGE_TYPE_CHOICES = [('before', 'Before'), ('after', 'After')]
    SIDE_CHOICES = [('lhs', 'LHS'), ('rhs', 'RHS'), ('both', 'Both')]

    observation = models.ForeignKey('Observation', on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='observations/')
    caption = models.CharField(max_length=255, blank=True, null=True)
    image_type = models.CharField(max_length=10, choices=IMAGE_TYPE_CHOICES, default='before')
    side = models.CharField(max_length=10, choices=SIDE_CHOICES, default='lhs')
    timestamp = models.DateTimeField(default=timezone.now)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    location_name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.caption or 'No Caption'} - {self.image_type}"

    def save(self, *args, **kwargs):
        # Auto fetch location name if coordinates available
        if self.latitude and self.longitude and not self.location_name:
            try:
                import requests
                url = (
                    f"https://nominatim.openstreetmap.org/reverse?format=json"
                    f"&lat={self.latitude}&lon={self.longitude}&zoom=15&addressdetails=1"
                )
                resp = requests.get(url, headers={'User-Agent': 'Django-App'})
                if resp.status_code == 200:
                    data = resp.json()
                    self.location_name = data.get('display_name', '')
            except Exception as e:
                print("Location fetch error:", e)

        super().save(*args, **kwargs)  # Save image without overlay


class SummaryStat(models.Model):
    bridge = models.OneToOneField(Bridge, on_delete=models.CASCADE)
    critical_total = models.IntegerField(default=0)
    critical_lhs = models.IntegerField(default=0)
    critical_rhs = models.IntegerField(default=0)

    moderate_total = models.IntegerField(default=0)
    moderate_lhs = models.IntegerField(default=0)
    moderate_rhs = models.IntegerField(default=0)

    cleaning_total = models.IntegerField(default=0)
    cleaning_lhs = models.IntegerField(default=0)
    cleaning_rhs = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stats for {self.bridge.name}"
