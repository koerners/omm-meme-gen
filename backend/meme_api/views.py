import urllib
from pathlib import Path

from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from moviepy.video.VideoClip import ImageClip
from moviepy.video.compositing.concatenate import concatenate_videoclips
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from meme_api.models import Meme, Comment, Vote, VideoCreation, TopFiveMemes
from meme_api.permissions import IsOwnerOrReadOnly, IsAdminOrCreateOnly
from meme_api.serializers import UserSerializer, MemeSerializer, CommentSerializer, VoteSerializer

from django.db.models import Q, Count
from django.db.models.functions import ExtractMonth as Month, ExtractYear as Year, ExtractDay as Day, TruncDay
import os
import re
import base64
import requests
from PIL import Image, ImageDraw, ImageFont
import json, io, zipfile
import urllib.parse
import numpy as np
from skimage.transform import resize


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

        return JsonResponse(list(available), safe=False)

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

        upvotes = len(Vote.objects.filter(meme_id=meme_id_, upvote=True))
        downvotes = len(Vote.objects.filter(meme_id=meme_id_, upvote=False))
        voted = False
        liked = False
        own_vote = Vote.objects.filter(owner=request.user, meme_id=meme_id_)
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
            images = os.listdir(
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/memeTemplates'))

            backend_basename = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

            templates = []

            for image in images:
                with open(os.path.join(backend_basename, 'media/memeTemplates', image), "rb") as image_file:
                    base64_bytes = base64.b64encode(image_file.read())
                    base64_string = base64_bytes.decode('utf-8')
                    templates.append({'name': re.sub(r'.png$', '', image), 'base64_string': base64_string})

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

        meme_data = next(
            (template for template in cls.get_available_meme_templates() if template['name'] == searched_template),
            {'error': 'meme template not found'})

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

            cls.image_paths = [os.path.join(backend_basename, meme_templates_dir, image_name) for image_name in
                               os.listdir(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                                                       'media/memeTemplates'))]

        return cls.image_paths

    @classmethod
    def create_meme(cls, request):
        template_name = request.GET.get('templateName')
        if template_name is None:
            return JsonResponse({'message': 'missing \'templateName\' in query params'}, status=400)

        meme_template_path = next(
            (template for template in cls.get_image_paths() if template.endswith(template_name + '.png')), None)
        if meme_template_path is None:
            return JsonResponse({'message': 'meme template could not be found'}, status=400)

        # rp is short for request parameters
        qp = cls.get_query_parameters(request)

        img = Image.open(meme_template_path)
        image_draw = ImageDraw.Draw(img)

        top_text = request.GET.get('topText', '')
        text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, top_text, qp.get('font'))
        x = (img.width - text_width) / 2
        ascent, _ = qp.get('font').getmetrics()
        y = 50 - ascent
        cls.draw_text(image_draw, top_text, x, y, qp)

        bottom_text = request.GET.get('bottomText', '')
        text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, bottom_text, qp.get('font'))
        x = (img.width - text_width) / 2
        ascent, _ = qp.get('font').getmetrics()
        y = img.height - (50 + ascent)
        cls.draw_text(image_draw, bottom_text, x, y, qp)

        # keys which are necessary to place a text (other than topText or bottomText) in image
        expect_keys = ['x', 'y', 'text']

        try:
            other_texts = json.loads(request.GET.get('otherTexts').replace('\'', '"'))
            if isinstance(other_texts, list):
                for cur_txt_dict in other_texts:
                    if all(key in cur_txt_dict for key in expect_keys):
                        cls.draw_text(image_draw, cur_txt_dict.get('text'), cur_txt_dict.get('x'),
                                      cur_txt_dict.get('y'), qp)

        except (json.decoder.JSONDecodeError, AttributeError, ValueError):
            pass

        response = HttpResponse(content_type='image/png')

        img.save(response, 'PNG')

        return response

    @classmethod
    def create_memes(cls, request):
        template_name = request.GET.get('templateName')
        if template_name is None:
            return JsonResponse({'message': 'missing \'templateName\' in query params'}, status=400)

        meme_template_path = next(
            (template for template in cls.get_image_paths() if template.endswith(template_name + '.png')), None)
        if meme_template_path is None:
            return JsonResponse({'message': 'meme template could not be found'}, status=400)

        # rp is short for request parameters
        qp = cls.get_query_parameters(request)

        created_memes = []

        # keys which are necessary to place a text (other than topText or bottomText) in image
        expect_keys = ['x', 'y', 'text']

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
                                    text = cur_txt_dict.pop('topText')
                                    text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, text, qp.get('font'))
                                    x = (img.width - text_width) / 2
                                    ascent, _ = qp.get('font').getmetrics()
                                    y = 50 - ascent
                                    cls.draw_text(image_draw, text, x, y, qp)
                                if 'bottomText' in cur_txt_dict:
                                    text = cur_txt_dict.pop('bottomText')
                                    text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, text, qp.get('font'))
                                    x = (img.width - text_width) / 2
                                    ascent, _ = qp.get('font').getmetrics()
                                    y = img.height - (50 + ascent)
                                    cls.draw_text(image_draw, text, x, y, qp)
                                if all(key in cur_txt_dict for key in expect_keys):
                                    cls.draw_text(image_draw, cur_txt_dict.get('text'), cur_txt_dict.get('x'),
                                                  cur_txt_dict.get('y'), qp)
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
                zf.writestr('meme' + str(index) + '.png', image)

        response = HttpResponse(zip_archive.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="%s"' % 'memes.zip'
        return response

    @classmethod
    def get_query_parameters(cls, request):
        def get_font_style_path(font_style):
            return os.path.join(cls.font_style_path, font_style)

        try:
            font_size = int(request.GET.get('fontSize'))
        except (ValueError, TypeError):
            font_size = cls.default_font_size

        bold = request.GET.get('bold')
        italic = request.GET.get('italic')
        underline = request.GET.get('underline')

        if bold in ["True", "true"] and italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold_italic), font_size)
        elif bold in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_bold), font_size)
        elif italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(cls.font_italic), font_size)
        else:
            font = ImageFont.truetype(get_font_style_path(cls.font_default), font_size)

        try:
            fill_color = tuple(int(request.GET.get('colorHex')[i:i + 2], 16) for i in (0, 2, 4))
        except (ValueError, TypeError):
            fill_color = (0, 0, 0)

        return {'font_size': font_size, 'font': font, 'fill_color': fill_color, 'underline': underline}

    @classmethod
    def draw_text(cls, image_draw, text, x, y, qp):
        text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, text, qp.get('font'))
        ascent, _ = qp.get('font').getmetrics()
        image_draw.text((x, y), text, fill=qp.get('fill_color'), font=qp.get('font'))
        if qp.get('underline') in ["True", "true"]:
            image_draw.line(((x, y + ascent), (x + text_width, y + ascent)), fill=qp.get('fill_color'),
                            width=int(qp.get('font_size') / 10))


class IMGFlip:
    @action(detail=False)
    def get_imgflip_memes(self):
        imgflip_response = requests.get('https://api.imgflip.com/get_memes')

        if imgflip_response.status_code == 200:
            return HttpResponse(imgflip_response)


class SendStatistics:
    @action(detail=False)
    def send_statisticis(self):
        top_five_memes = list(Meme.objects.values('id', 'title'
                                                  , 'views').order_by('-views')[:5])
        return JsonResponse(top_five_memes, safe=False)


class SendUserStatistics:
    def send_userStatistics(self):
        user_database = list(User.objects
                             .annotate(date=TruncDay('last_login'), )
                             .values('date')
                             .annotate(count=Count('date'),
                                       day=Day('last_login'),
                                       month=Month('last_login'),
                                       year=Year('last_login'))
                             .values('day', 'month', 'year', 'date', 'count'))
        print(user_database)
        return JsonResponse(user_database, safe=False)


class ScreenshotFromUrl:
    @action(detail=False)
    def get_screenshot(request):
        encoded_url = request.GET.get('url')
        if encoded_url is not None and encoded_url != '':
            url = urllib.parse.unquote(encoded_url)
            CHROMEDRIVER_PATH = '/usr/bin/chromedriver'
            WINDOW_SIZE = "800,1080"

            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--window-size=%s" % WINDOW_SIZE)
            driver = webdriver.Chrome(CHROMEDRIVER_PATH, chrome_options=chrome_options)
            driver.get(url)
            screenshot_img = driver.get_screenshot_as_base64()
            driver.quit()
            screenshot = screenshot_img

            return HttpResponse(screenshot)

        return None


class MemesToVideo:
    @action(detail=False)
    def send_video(self):
        '''
        turn top five memes into video
        '''
        file = Path('media/memeTemplates/my_video.ogv')
        v = VideoCreation.objects.all()[0]
        val = Meme.objects.values().count()
        if val > 5:
            val = 5
        top_five_memes = Meme.objects.values().order_by('-views')[:val]
        x = list(top_five_memes.values_list('id', flat=True))
        top_five = list(range(0, 5))
        y = list(TopFiveMemes.objects.all().values_list('top_five_memes', flat=True))
        '''
        Check most views changes
        '''
        if (x != y):
            print('yep')
            for i in top_five:
                obj = Meme.objects.get(id=x[i])
                t = TopFiveMemes.objects.all()[i]
                t.top_five_memes = obj
                t.save()

        if not file.is_file():
            if not v.is_video_creation_running and (x == y):
                do_create(v,top_five_memes)
                return JsonResponse('/media/memeTemplates/my_video.ogv', safe=False)
            elif not v.is_video_creation_running and (x != y):
                do_create(v,top_five_memes)
                return JsonResponse('/media/memeTemplates/my_video.ogv', safe=False)
        elif not v.is_video_creation_running and (x != y):
            do_create(v,top_five_memes)
            return JsonResponse('/media/memeTemplates/my_video.ogv', safe=False)
        else:
            return JsonResponse('/media/memeTemplates/my_video.ogv', safe=False)


def load_images(top_five_memes):
    vlqs = top_five_memes.values_list('image_string', flat=True)
    return vlqs


def images_to_video(top_five_memes):
    vlqs = load_images(top_five_memes)
    image_dict = {}
    count = 0
    for img in vlqs:
        count += 1
        base64_decoded = base64.b64decode(img[22:])
        image = Image.open(io.BytesIO(base64_decoded))
        image_np = np.array(image, dtype='uint8')
        open_cv_image = resize(image_np, (300, 500))
        image_dict[count] = open_cv_image * 255

    framerate = 25
    clips = [ImageClip(v).set_duration(5) for k, v in image_dict.items()]
    concat_clip = concatenate_videoclips(clips, method="compose")
    concat_clip.write_videofile('media/memeTemplates/my_video.ogv', fps=framerate)


def do_create(v, top_five_memes):
    v.is_video_creation_running = True
    v.save()
    images_to_video(top_five_memes)
    v.is_video_creation_running = False
    v.save()
