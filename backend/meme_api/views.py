from django.contrib.auth.models import User, Group
from django.http import JsonResponse
from rest_framework import generics
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from meme_api.models import Meme
from meme_api.permissions import IsOwnerOrReadOnly
from meme_api.serializers import UserSerializer, GroupSerializer, MemeSerializer


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    # permission_classes = [permissions.IsAuthenticated]


@api_view(['GET'])
def current_user(request):
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


@api_view(['GET'])
def user_memes(request):
    user = request.user
    data = Meme.objects.filter(owner=user).order_by('-created').values()
    print(data)

    return JsonResponse(list(data), safe=False)


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

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class MemeDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Meme.objects.all()
    serializer_class = MemeSerializer

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
