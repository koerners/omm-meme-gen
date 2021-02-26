from django.contrib.auth.models import User, Group
from rest_framework import serializers

from meme_api.models import Meme, Comment, Vote, Template
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
    pos_votes = serializers.SerializerMethodField('how_many_pos')

    def how_many_pos(self, meme):
        try:
            votes = len(Vote.objects.filter(meme=meme, upvote=True))
        except Exception as e:
            votes = 0

        return votes

    class Meta:
        model = Meme
        fields = ['id', 'title', 'owner', 'image_string', 'views', 'private', 'pos_votes', 'type']

    owner = serializers.ReadOnlyField(source='owner.username')


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


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ['id', 'title', 'image_string', ]
