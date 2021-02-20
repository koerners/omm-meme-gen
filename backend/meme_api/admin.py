from django.contrib import admin

# Register your models here.
from meme_api.models import Meme, Comment, Vote, VideoCreation, TopFiveMemes, Template, TemplateStats

admin.site.register(Meme)
admin.site.register(Comment)
admin.site.register(Vote)
admin.site.register(VideoCreation)
admin.site.register(TopFiveMemes)
admin.site.register(Template)
admin.site.register(TemplateStats)