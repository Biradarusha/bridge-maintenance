from django.shortcuts import render, get_object_or_404
from django.contrib.admin.views.decorators import staff_member_required
from .models import Project, Bridge, Observation, SummaryStat

from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from .models import Project, Bridge, Observation

@staff_member_required
def index(request):
    try:
        # Get the first project or create a default one
        project = Project.objects.first()
        if not project:
            project = Project.objects.create(
                name="NH-9 Bridge Inspection Project",
                location="Solapur - Karnataka Border",
                description="Comprehensive bridge inspection and maintenance reporting system for National Highway 9"
            )

        # All bridges under this project
        bridges = Bridge.objects.filter(project=project)

        # All observations for this project
        all_observations = Observation.objects.filter(bridge__project=project).prefetch_related('images')

        # Calculate summary statistics dynamically
        summary_stats = [{
            'critical_total': all_observations.filter(severity='critical').count(),
            'critical_lhs': all_observations.filter(severity='critical', side='lhs').count(),
            'critical_rhs': all_observations.filter(severity='critical', side='rhs').count(),

            'moderate_total': all_observations.filter(severity='moderate').count(),
            'moderate_lhs': all_observations.filter(severity='moderate', side='lhs').count(),
            'moderate_rhs': all_observations.filter(severity='moderate', side='rhs').count(),

            'cleaning_total': all_observations.filter(severity='cleaning').count(),
            'cleaning_lhs': all_observations.filter(severity='cleaning', side='lhs').count(),
            'cleaning_rhs': all_observations.filter(severity='cleaning', side='rhs').count(),
        }]

        # Sides for observation display
        sides = ["lhs", "rhs"]

        context = {
            'project': project,
            'bridges': bridges,
            'summary_stats': summary_stats,
            'observations': all_observations,
            'sides': sides,
        }
        return render(request, 'index.html', context)

    except Exception as e:
        # Fallback context in case of error
        context = {
            'project': None,
            'bridges': [],
            'summary_stats': [],
            'observations': [],
            'sides': ['lhs', 'rhs'],
            'error': str(e)
        }

def observation_map(request):
    obs = Observation.objects.first()
    return render(request, "observation_map.html", {
        "lat": obs.lat if obs else 12.9716,
        "lng": obs.lng if obs else 77.5946,
        "observation": obs
    })

def map_viewer(request):
    lat = request.GET.get('lat', '28.6139')
    lng = request.GET.get('lng', '77.2090')
    title = request.GET.get('title', 'Observation Location')
    
    context = {
        'lat': lat,
        'lng': lng,
        'title': title,
    }
    return render(request, 'bridges/map_viewer.html', context)


