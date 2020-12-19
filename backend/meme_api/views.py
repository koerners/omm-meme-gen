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

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.views = obj.views + 1
        obj.save(update_fields=("views",))
        return super().retrieve(request, *args, **kwargs)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class CommentList(viewsets.ModelViewSet):

    @action(detail=False)
    def comments_by_meme(self, request):
        meme_id_ = int(request.GET.get("meme", ""))
        print(meme_id_)
        comments_by_meme = Comment.objects.filter(meme_id=meme_id_).order_by('-created').values()
        for comment in comments_by_meme:
            comment['owner'] = User.objects.filter(id=comment['owner_id'])[0].last_name
        return Response(comments_by_meme)

    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class VoteList(viewsets.ModelViewSet):
    @action(detail=False)
    def votes_by_meme(self, request):
        meme_id_ = int(request.GET.get("meme", ""))
        print(meme_id_)
        upvotes = len(Vote.objects.filter(meme_id=meme_id_, upvote=True))
        downvotes = len(Vote.objects.filter(meme_id=meme_id_, upvote=False))
        voted = False
        liked = False
        own_vote = Vote.objects.filter(owner=request.user, meme_id=meme_id_)
        print(own_vote)
        if len(own_vote) > 0:
            voted = True
            liked = own_vote[0].upvote

        data = {"upvotes": upvotes, "downvotes": downvotes, "voted": voted, "liked": liked}

        return Response(data)

    queryset = Vote.objects.all()
    serializer_class = VoteSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
