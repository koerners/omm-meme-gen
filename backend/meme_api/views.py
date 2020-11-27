from django.contrib.auth.models import User, Group
from rest_framework import generics
from rest_framework import permissions
from rest_framework import viewsets

from meme_api.models import Meme
from meme_api.permissions import IsOwnerOrReadOnly
from meme_api.serializers import UserSerializer, GroupSerializer, MemeSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    #permission_classes = [permissions.IsAuthenticated]


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer
    permission_classes = [permissions.IsAuthenticated]


class MemeList(generics.ListCreateAPIView):
    queryset = Meme.objects.all()
    serializer_class = MemeSerializer

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class MemeDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Meme.objects.all()
    serializer_class = MemeSerializer

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]