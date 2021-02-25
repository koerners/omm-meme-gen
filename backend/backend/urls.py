from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django.conf.urls.static import static
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView, TokenVerifyView,
)
import os
from django.http import HttpResponse

from meme_api import views
from django.views.decorators.csrf import csrf_exempt


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
    path('admin/', admin.site.urls),
    path('blub', lambda request: HttpResponse('Hello World!')),
    path('memeTemplates/', views.MemeTemplate.get_all_meme_templates),
    path('memeTemplate/', views.MemeTemplate.get_meme_template),
    path('createMeme/', views.MemeCreation.create_meme),
    path('createMemes/', views.MemeCreation.create_memes),
    path('imgFlip/', views.IMGFlip.get_imgflip_memes),
    path('convertVideoToImages/', csrf_exempt(views.VideoTemplates.upload_video_to_server)),
    path('addTextToVideo/', csrf_exempt(views.VideoTemplates.add_text_to_video)),
] + static('/media/videoMedia', document_root=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/videoMedia'))
