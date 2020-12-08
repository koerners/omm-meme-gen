from django.db import models


class Meme(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=100, blank=True, default='')
    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey('auth.User', related_name='meme', on_delete=models.CASCADE)
    image_string = models.CharField(max_length=9999999999999999999, default='')
    upvotes = models.IntegerField(default=0)
    downvotes = models.IntegerField(default=0)

    class Meta:
        ordering = ['created']
