from django import forms
from .models import ObservationImage

class ObservationImageForm(forms.ModelForm):
    class Meta:
        model = ObservationImage
        fields = ['observation', 'image', 'caption', 'image_type']
        widgets = {
            'caption': forms.TextInput(attrs={'placeholder': 'Enter caption'}),
            'image_type': forms.Select(),
        }
