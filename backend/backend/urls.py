from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView, TokenVerifyView,
)

from meme_api import views

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'meme', views.MemeList)
router.register(r'comments', views.CommentList)
router.register(r'vote', views.VoteList)

# Wire up our API using automatic URL routing.
# Additionally, we include login URLs for the browsable API.
urlpatterns = [
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
