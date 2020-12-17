from django.contrib.auth.models import User, Group
from django.http import JsonResponse
from rest_framework import generics
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.decorators import api_view, action
from rest_framework.response import Response

from meme_api.models import Meme, Comment, Vote
from meme_api.permissions import IsOwnerOrReadOnly
from meme_api.serializers import UserSerializer, MemeSerializer, CommentSerializer, VoteSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    @action(detail=False)
    def self(self, request):
        user = request.user
        if not user.is_anonymous:
            return Response({
                'id': user.id,
                'username': user.last_name,
                'email': user.email,
            })
        else:
            return Response({
                'username': "Anonymus"
            })

    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    # permission_classes = [permissions.IsAuthenticated]


class MemeList(viewsets.ModelViewSet):
    @action(detail=False)
    def own(self, request):
        own_memes = Meme.objects.filter(owner=request.user).order_by('-created').values()

        page = self.paginate_queryset(own_memes)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(own_memes, many=True)
        return Response(serializer.data)

    queryset = Meme.objects.all()
    serializer_class = MemeSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class CommentList(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class VoteList(viewsets.ModelViewSet):
    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
