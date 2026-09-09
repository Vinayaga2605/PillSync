from django.contrib import admin
from .models import User, CaregiverAssignment

admin.site.register(User)
admin.site.register(CaregiverAssignment)