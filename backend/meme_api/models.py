from django.db import models


class Meme(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=100, blank=True, default='')
    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey('auth.User', related_name='meme', on_delete=models.CASCADE)
    image_string = models.CharField(max_length=9999999999999999999, default='')
    views = models.IntegerField(default=0)
    private = models.BooleanField(default=False)
    type = models.IntegerField(default=0)

    class Meta:
        ordering = ['created']


class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    created = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey('auth.User', related_name='comment', on_delete=models.CASCADE)
    meme = models.ForeignKey('Meme', related_name='meme_comment', on_delete=models.CASCADE)
    text = models.CharField(max_length=9999999999, default='')

    class Meta:
        ordering = ['created']


class Vote(models.Model):
    id = models.AutoField(primary_key=True)
    created = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey('auth.User', related_name='vote', on_delete=models.CASCADE)
    meme = models.ForeignKey('Meme', related_name='meme_vote', on_delete=models.CASCADE)
    upvote = models.BooleanField(default=False)

    class Meta:
        ordering = ['created']

class Video(models.Model):
    video = models.FileField()

    class Meta:
        verbose_name_plural = "Videos"

    def __str__(self):
        return self.video.name

class VideoCreation(models.Model):
    is_video_creation_running = models.BooleanField(default=False)


class TopFiveMemes(models.Model):
    top_five_memes = models.ForeignKey('Meme', related_name='top_five_memes', null=True, on_delete=models.SET('1'))


class Template(models.Model):
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=100, blank=True, default='')
    image_string = models.CharField(max_length=9999999999999999999, default='')


class TemplatesOvertime(models.Model):
    id = models.AutoField(primary_key=True)
    date = models.DateTimeField(auto_now_add=True, editable=True, blank=False)
    used = models.BooleanField(default=False)
    template = models.ForeignKey('Template', on_delete=models.CASCADE)
    meme = models.ForeignKey('Meme', on_delete=models.CASCADE, blank=True, null=True)
