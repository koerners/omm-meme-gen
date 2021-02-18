from django.db import models


class Meme(models.Model):
    created = models.DateTimeField(auto_now_add=True)
    title = models.CharField(max_length=100, blank=True, default='')
    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey('auth.User', related_name='meme', on_delete=models.CASCADE)
    image_string = models.CharField(max_length=9999999999999999999, default='')
    views = models.IntegerField(default=0)
    private = models.BooleanField(default=False)





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
#
# class MemeTopHstory(models.Model):
#     id = models.AutoField(primary_key=True)
#     top_meme = models.aggregates(max(models))
