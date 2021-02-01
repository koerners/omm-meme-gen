from django.contrib.auth.models import User, Group
from rest_framework import serializers

from meme_api.models import Meme, Comment, Vote
from random_username.generate import generate_username


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'email', 'last_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        if len(str(validated_data['last_name'])) < 1:
            validated_data['last_name'] = generate_username()[0]

        user = super(UserSerializer, self).create(validated_data)
        user.set_password(validated_data['password'])

        user.save()
        return user


class MemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meme
        fields = ['id', 'title', 'owner', 'image_string', 'views', 'meme_comment', 'comments', 'meme_vote', 'upvotes', 'downvotes', 'private', 'created']

    owner = serializers.ReadOnlyField(source='owner.username')
    comments = serializers.IntegerField(
        source='meme_comment.count',
        read_only=True
    )
    upvotes = serializers.SerializerMethodField()
    downvotes = serializers.SerializerMethodField()

    def get_upvotes(self, obj):
        upvotes = 0
        for val in obj.meme_vote.all():
            if val.upvote == True:
                upvotes+=1
        return upvotes

    def get_downvotes(self, obj):
        downvotes = 0
        for val in obj.meme_vote.all():
            if val.upvote == False:
                downvotes+=1
        return downvotes


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['meme', 'text', 'owner', 'created']

    owner = serializers.ReadOnlyField(source='owner.username')


class VoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vote
        fields = ['meme', 'upvote', 'owner']

    owner = serializers.ReadOnlyField(source='owner.username')
