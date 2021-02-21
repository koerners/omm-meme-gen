from django.contrib import admin

# Register your models here.
from meme_api.models import Meme, Comment, Vote, Video




admin.site.register(Meme)
admin.site.register(Comment)
admin.site.register(Vote)
admin.site.register(Video)