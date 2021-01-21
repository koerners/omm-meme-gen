from django.contrib.auth.models import User, Group
from django.http import JsonResponse, HttpResponse
from rest_framework import generics
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework import views
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from meme_api.models import Meme, Comment, Vote
from meme_api.permissions import IsOwnerOrReadOnly, IsAdminOrCreateOnly
from meme_api.serializers import UserSerializer, MemeSerializer, CommentSerializer, VoteSerializer

from django.db.models import Q
import os
import re
import base64
import requests
from PIL import Image, ImageDraw, ImageFont
import json, io, zipfile


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """

    @action(detail=False, permission_classes=[permissions.IsAuthenticated])
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
    permission_classes = [IsAdminOrCreateOnly]


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

    @action(detail=False)
    def availableMemes(self, request):
        available = Meme.objects.filter(Q(owner=request.user) | Q(private=False)).order_by('-created').values('id')

        serializer = self.get_serializer(available, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def list(self, request):
        queryset = Meme.objects.filter(private=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)

        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.views = obj.views + 1
        obj.save(update_fields=("views",))
        return super().retrieve(request, *args, **kwargs)

    queryset = Meme.objects.all()
    serializer_class = MemeSerializer

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


class MemeTemplate:

    available_meme_templates = None

    @classmethod
    def get_available_meme_templates(cls):
        if not cls.available_meme_templates:
            images = os.listdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/memeTemplates'))

            backend_basename = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

            templates = []

            for image in images:
                with open(os.path.join(backend_basename, 'media/memeTemplates', image), "rb") as image_file:
                    base64_bytes = base64.b64encode(image_file.read())
                    base64_string = base64_bytes.decode('utf-8')
                    templates.append({'name': re.sub(r'.png$', '', image), 'base64_string': base64_string})

            print(templates[0])
            cls.available_meme_templates = templates

        return cls.available_meme_templates

    @classmethod
    def get_all_meme_templates(cls, request):
        return JsonResponse(cls.get_available_meme_templates(), safe=False)

    @classmethod
    def get_meme_template(cls, request):
        if not cls.available_meme_templates:
            cls.load_available_meme_templates()

        searched_template = request.GET.get('name')

        meme_data = next((template for template in cls.get_available_meme_templates() if template['name'] == searched_template), {'error': 'meme template not found'})

        return JsonResponse(meme_data)


class MemeCreation:

    image_paths = None
    default_font_size = 30
    font_default = 'Ubuntu-M.ttf'
    font_bold = 'Ubuntu-B.ttf'
    font_italic = 'Ubuntu-MI.ttf'
    font_bold_italic = 'Ubuntu-BI.ttf'
    font_style_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/fonts')

    @classmethod
    def get_image_paths(cls):
        if not cls.image_paths:
            backend_basename = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

            meme_templates_dir = 'media/memeTemplates'

            cls.image_paths = [os.path.join(backend_basename, meme_templates_dir, image_name) for image_name in os.listdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/memeTemplates'))]

        return cls.image_paths

    @classmethod
    def create_meme(cls, request):
        template_name = request.GET.get('templateName')
        if template_name is None:
            return JsonResponse({'message': 'meme template not found'}, status=400)

        meme_template_path = next((template for template in cls.get_image_paths() if template.endswith(template_name + '.png')), {'error': 'meme template not found'})
        img = Image.open(meme_template_path)
        image_draw = ImageDraw.Draw(img)

        bold = request.GET.get('bold')
        italic = request.GET.get('italic')
        underline = request.GET.get('underline')

        def get_font_style_path(font_style):
            return os.path.join(cls.font_style_path, font_style)

        try:
            font_size = int(request.GET.get('fontSize'))
        except (ValueError, TypeError):
            font_size = cls.default_font_size

        if bold in ["True", "true"] and italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold_italic), font_size)
        elif bold in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold), font_size)
        elif italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_italic), font_size)
        else:
            font = ImageFont.truetype(get_font_style_path(cls.font_default), font_size)

        try:
            fill_color = tuple(int(request.GET.get('colorHex')[i:i+2], 16) for i in (0, 2, 4))
        except (ValueError, TypeError):
            fill_color = (0, 0, 0)

        top_text = request.GET.get('topText', '')
        top_text_width, top_text_height = ImageDraw.ImageDraw.textsize(image_draw, top_text, font)

        bottom_text = request.GET.get('bottomText', '')
        bottom_text_width, bottom_text_height = ImageDraw.ImageDraw.textsize(image_draw, bottom_text, font)

        top_text_x_coord = (img.width - top_text_width) / 2
        top_text_y_coord = 50 - top_text_height * 0.79
        image_draw.text((top_text_x_coord, top_text_y_coord), top_text, fill=fill_color, font=font)
        if underline in ["True", "true"]:
            image_draw.line(((top_text_x_coord, 50), (top_text_x_coord + top_text_width, 50)), fill=fill_color, width=int(font_size / 10))

        bottom_text_x_coord = (img.width - bottom_text_width) / 2
        ascent, descent = font.getmetrics()
        bottom_text_y_coord = 50 + ascent
        image_draw.text((bottom_text_x_coord, img.height - bottom_text_y_coord), bottom_text, fill=fill_color, font=font)
        if underline in ["True", "true"]:
            image_draw.line(((bottom_text_x_coord, img.height - 50), (bottom_text_x_coord + bottom_text_width, img.height - 50)), fill=fill_color, width=int(font_size / 10))

        necessary_keys_for_other_texts = ['x', 'y', 'text']
        try:
            other_texts = json.loads(request.GET.get('otherTexts').replace('\'', '"'))
            if isinstance(other_texts, list):
                for cur_txt_dict in other_texts:
                    if all(key in cur_txt_dict for key in necessary_keys_for_other_texts):
                        image_draw.text((cur_txt_dict.get('x'), cur_txt_dict.get('y')), cur_txt_dict.get('text'), fill=fill_color, font=font)
                        text_width, text_height = ImageDraw.ImageDraw.textsize(image_draw, cur_txt_dict.get('text'), font)
                        if underline in ["True", "true"]:
                            image_draw.line(((cur_txt_dict.get('x'), cur_txt_dict.get('y') + text_height), (cur_txt_dict.get('x') + text_width, cur_txt_dict.get('y') + text_height)), fill=fill_color, width=int(font_size / 10))

        except (json.decoder.JSONDecodeError, AttributeError, ValueError):
            pass

        response = HttpResponse(content_type='image/png')

        img.save(response, 'PNG')

        return response

    @classmethod
    def create_memes(cls, request):
        template_name = request.GET.get('templateName')
        if template_name is None:
            return JsonResponse({'message': 'meme template not found'}, status=400)

        img = None

        meme_template_path = next((template for template in cls.get_image_paths() if template.endswith(template_name + '.png')), None)
        if meme_template_path is None:
            return JsonResponse({'message': 'meme template not found'}, status=400)

        bold = request.GET.get('bold')
        italic = request.GET.get('italic')
        underline = request.GET.get('underline')

        def get_font_style_path(font_style):
            return os.path.join(cls.font_style_path, font_style)

        try:
            font_size = int(request.GET.get('fontSize'))
        except (ValueError, TypeError):
            font_size = cls.default_font_size

        if bold in ["True", "true"] and italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold_italic), font_size)
        elif bold in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold), font_size)
        elif italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_italic), font_size)
        else:
            font = ImageFont.truetype(get_font_style_path(cls.font_default), font_size)

        try:
            fill_color = tuple(int(request.GET.get('colorHex')[i:i+2], 16) for i in (0, 2, 4))
        except (ValueError, TypeError):
            fill_color = (0, 0, 0)

        created_memes = []

        necessary_keys_for_other_texts = ['x', 'y', 'text']
        try:
            text_lists = json.loads(request.GET.get('textLists').replace('\'', '"'))
            if isinstance(text_lists, list):
                for text_list in text_lists:
                    if isinstance(text_list, list):
                        img = Image.open(meme_template_path)
                        image_draw = ImageDraw.Draw(img)
                        buffer = io.BytesIO()
                        for cur_txt_dict in text_list:
                            if isinstance(cur_txt_dict, dict):
                                if 'topText' in cur_txt_dict:
                                    top_text = cur_txt_dict.pop('topText')
                                    top_text_width, top_text_height = ImageDraw.ImageDraw.textsize(image_draw, top_text, font)
                                    top_text_x_coord = (img.width - top_text_width) / 2
                                    top_text_y_coord = 50 - top_text_height * 0.79
                                    image_draw.text((top_text_x_coord, top_text_y_coord), top_text, fill=fill_color, font=font)
                                    if underline in ["True", "true"]:
                                        image_draw.line(((top_text_x_coord, 50), (top_text_x_coord + top_text_width, 50)), fill=fill_color, width=int(font_size / 10))
                                if 'bottomText' in cur_txt_dict:
                                    bottom_text = cur_txt_dict.pop('bottomText')
                                    bottom_text_width, bottom_text_height = ImageDraw.ImageDraw.textsize(image_draw, bottom_text, font)
                                    bottom_text_x_coord = (img.width - bottom_text_width) / 2
                                    ascent, descent = font.getmetrics()
                                    bottom_text_y_coord = 50 + ascent
                                    image_draw.text((bottom_text_x_coord, img.height - bottom_text_y_coord), bottom_text, fill=fill_color, font=font)
                                    if underline in ["True", "true"]:
                                        image_draw.line(((bottom_text_x_coord, img.height - 50), (bottom_text_x_coord + bottom_text_width, img.height - 50)), fill=fill_color, width=int(font_size / 10))
                                if all(key in cur_txt_dict for key in necessary_keys_for_other_texts):
                                    image_draw.text((cur_txt_dict.get('x'), cur_txt_dict.get('y')), cur_txt_dict.get('text'), fill=fill_color, font=font)
                                    text_width, text_height = ImageDraw.ImageDraw.textsize(image_draw, cur_txt_dict.get('text'), font)
                                    if underline in ["True", "true"]:
                                        image_draw.line(((cur_txt_dict.get('x'), cur_txt_dict.get('y') + text_height), (cur_txt_dict.get('x') + text_width, cur_txt_dict.get('y') + text_height)), fill=fill_color, width=int(font_size / 10))
                        img.save(buffer, 'PNG')
                        created_memes.append(buffer.getvalue())
                        buffer.close()
        except json.decoder.JSONDecodeError:
            return JsonResponse({'message': 'could not parse param \'textLists\''}, status=400)
        except EOFError as e:
            print(e)
            pass

        zip_archive = io.BytesIO()
        with zipfile.ZipFile(zip_archive, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for index, image in enumerate(created_memes):
                zf.writestr('meme'+str(index)+'.png', image)

        response = HttpResponse(zip_archive.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="%s"' % 'memes.zip'
        return response


class IMGFlip:

    @action(detail=False)
    def get_imgflip_memes(self):
        imgflip_response = requests.get('https://api.imgflip.com/get_memes')
        print(imgflip_response)
        if imgflip_response.status_code == 200:
            return JsonResponse(imgflip_response)
