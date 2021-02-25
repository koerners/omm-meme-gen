from django.contrib import admin

# Register your models here.
from meme_api.models import Meme, Comment, Vote, VideoCreation, TopFiveMemes, Template, TemplatesOvertime, Video

admin.site.register(Meme)
admin.site.register(Comment)
admin.site.register(Vote)
admin.site.register(Video)
admin.site.register(VideoCreation)
admin.site.register(TopFiveMemes)
admin.site.register(Template)
admin.site.register(TemplatesOvertime)
