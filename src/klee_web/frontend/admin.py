from django.contrib import admin

from frontend.models import Task, Project, File, GameChallenge


admin.site.register(Task)
admin.site.register(Project)
admin.site.register(File)
admin.site.register(GameChallenge)
