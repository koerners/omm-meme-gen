from django.contrib.auth.models import User, Group
from rest_framework import serializers

from meme_api.models import Meme, Comment, Vote



class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'email', 'last_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        if len(str(validated_data['username'])) < 1:
            validated_data['username'] = "asdasdasdasd"

        user = super(UserSerializer, self).create(validated_data)
        user.set_password(validated_data['password'])

        user.save()
        return user


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ['url', 'name']


class MemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meme
        fields = ['id', 'title', 'owner', 'image_string']

    owner = serializers.ReadOnlyField(source='owner.username')


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment

    fields = ['meme', 'text', 'writer']

    writer = serializers.ReadOnlyField(source='writer.username')


class VoteSerializer(serializers.ModelSerializer):
    class Vote:
        model = Vote

    fields = ['meme', 'upvote', 'voter']

    voter = serializers.ReadOnlyField(source='voter.username')
