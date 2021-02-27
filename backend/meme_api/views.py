import datetime
import urllib
from collections import defaultdict
from pathlib import Path
from random import Random, randint

from django.contrib.auth.models import User
from django.http import JsonResponse, HttpResponse
from rest_framework import generics, pagination
from django.views.decorators.csrf import csrf_exempt
from moviepy.video.VideoClip import ImageClip
from moviepy.video.compositing.concatenate import concatenate_videoclips
from rest_framework import permissions, filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
import cv2
import sys
from django.core.files.base import ContentFile
import uuid
import numpy as np
from moviepy.video.io.ImageSequenceClip import ImageSequenceClip

from backend.settings import BASE_DIR, MEDIA_URL
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from meme_api.models import Meme, Comment, Vote, VideoCreation, TopFiveMemes, Template, TemplatesOvertime
from meme_api.permissions import IsOwnerOrReadOnly, IsAdminOrCreateOnly
from meme_api.serializers import UserSerializer, MemeSerializer, CommentSerializer, VoteSerializer, TemplateSerializer
from django.db.models import Q, Count, Sum, F
from django.db.models.functions import ExtractMonth as Month, ExtractYear as Year, ExtractDay as Day, TruncDay
import os
import re
import base64
import requests
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont
import json, io, zipfile
import urllib.parse
import numpy as np
from skimage.transform import resize
from zipfile import ZipFile
import cv2

DEFAULT_FONT_SIZE = 30
FONT_DEFAULT = 'Ubuntu-M.ttf'
FONT_BOLD = 'Ubuntu-B.ttf'
FONT_ITALIC = 'Ubuntu-MI.ttf'
FONT_BOLD_ITALIC = 'Ubuntu-BI.ttf'
FONT_STYLE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/fonts')


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


class Zip:
    @classmethod
    @csrf_exempt
    def get_as_zip(cls, request):

        print(request.POST)
        start_date = None
        end_date = None
        start_votes = None
        end_votes = None
        start_views = None
        end_views = None
        search = None

        q = Meme.objects.all()
        if 'created' in request.POST:
            if '-created' in request.POST:
                end_date = request.POST.get("-created")
        else:
            start_date = request.POST.get("created")
        if "votes" in request.POST:
            if '-votes' in request.POST:
                end_votes = request.POST.get("-votes")
            else:
                start_votes = request.POST.get("votes")
        if 'views' in request.POST:
            if '-views' in request.POST:
                end_views = request.POST.get("-views")
            else:
                start_views = request.POST.get("views")
        if 'search' in request.POST:
            search = request.POST.get("search")

        max = int(request.POST.get("max"))

        if start_views is not None:
            q = q.filter(views__gte=start_views)
        if end_views is not None:
            q = q.filter(views__lte=end_views)
        if start_votes is not None:
            q = q.filter(votes__gte=start_votes)
        if end_votes is not None:
            q = q.filter(votes__lte=end_votes)
        if start_date is not None:
            q = q.filter(created__gte=start_date)
        if end_date is not None:
            q = q.filter(created__lte=end_date)
        if search is not None:
            q = q.filter(text_concated__contains=(search))
        print(q)

        zip_archive = io.BytesIO()
        with zipfile.ZipFile(zip_archive, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            print(list(enumerate(q)))
            for index, meme in enumerate(q):
                print(index, meme)
                if index > max:
                    break
                base64_decoded = base64.b64decode(meme.image_string[22:])
                zf.writestr('meme_' + str(index) + "_" + meme.title + '.png', base64_decoded)
        #
        # # zip_archive.seek(0)
        # print(zip_archive.getvalue())

        response = HttpResponse(zip_archive.getvalue())
        response['Content-Type'] = 'application/x-zip-compressed'
        response['Content-Disposition'] = 'attachment; filename="%s"' % 'memes.zip'
        return response


class MemeList(viewsets.ModelViewSet):
    queryset = Meme.objects.filter(private=False)
    serializer_class = MemeSerializer

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['text_concated', 'title']
    ordering_fields = ['created', 'views', 'pos_votes', 'n_comments', 'title', 'owner']

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    @action(detail=False)
    def own(self, request):
        print("own")
        filterfield = request.GET.get("filter", "")
        filtervalue = request.GET.get("value", "")
        self.queryset = Meme.objects.filter(owner=request.user)

        if filterfield == "views" and not filtervalue == "":
            print("filter: views>=" + filtervalue)
            self.queryset = self.queryset.filter(views__gte=int(filtervalue))
        elif filterfield == "-views" and not filtervalue == "":
            print("filter: views<=" + filtervalue)
            self.queryset = self.queryset.filter(views__lte=int(filtervalue))
        elif filterfield == "pos_votes" and not filtervalue == "":
            print("filter: pos_votes>=" + filtervalue)
            self.queryset = self.queryset.filter(pos_votes__gte=int(filtervalue))
        elif filterfield == "-pos_votes" and not filtervalue == "":
            print("filter: pos_votes<=" + filtervalue)
            self.queryset = self.queryset.filter(pos_votes__lte=int(filtervalue))
        elif filterfield == "n_comments" and not filtervalue == "":
            print("filter: n_comments>=" + filtervalue)
            self.queryset = self.queryset.filter(n_comments__gte=int(filtervalue))
        elif filterfield == "-n_comments" and not filtervalue == "":
            print("filter: n_comments<=" + filtervalue)
            self.queryset = self.queryset.filter(n_comments__lte=int(filtervalue))
        elif filterfield == "created" and not filtervalue == "":
            print("filter: created>=" + filtervalue)
            self.queryset = self.queryset.filter(created__gte=datetime.strptime(filtervalue, '%Y-%m-%d'))
        elif filterfield == "-created" and not filtervalue == "":
            print("filter: created<=" + filtervalue)
            self.queryset = self.queryset.filter(
                created__lte=datetime.strptime(filtervalue + " 23:59:59", '%Y-%m-%d %H:%M:%S'))

        return super().list(request)

    @action(detail=False)
    def all(self, request):
        print("all")
        filterfield = request.GET.get("filter", "")
        filtervalue = request.GET.get("value", "")
        self.queryset = Meme.objects.filter(private=False)

        if filterfield == "views" and not filtervalue == "":
            print("filter: views>=" + filtervalue)
            self.queryset = self.queryset.filter(views__gte=int(filtervalue))
        elif filterfield == "-views" and not filtervalue == "":
            print("filter: views<=" + filtervalue)
            self.queryset = self.queryset.filter(views__lte=int(filtervalue))
        elif filterfield == "pos_votes" and not filtervalue == "":
            print("filter: pos_votes>=" + filtervalue)
            self.queryset = self.queryset.filter(pos_votes__gte=int(filtervalue))
        elif filterfield == "-pos_votes" and not filtervalue == "":
            print("filter: pos_votes<=" + filtervalue)
            self.queryset = self.queryset.filter(pos_votes__lte=int(filtervalue))
        elif filterfield == "n_comments" and not filtervalue == "":
            print("filter: n_comments>=" + filtervalue)
            self.queryset = self.queryset.filter(n_comments__gte=int(filtervalue))
        elif filterfield == "-n_comments" and not filtervalue == "":
            print("filter: n_comments<=" + filtervalue)
            self.queryset = self.queryset.filter(n_comments__lte=int(filtervalue))
        elif filterfield == "created" and not filtervalue == "":
            print("filter: created>=" + filtervalue)
            self.queryset = self.queryset.filter(created__gte=datetime.strptime(filtervalue, '%Y-%m-%d'))
        elif filterfield == "-created" and not filtervalue == "":
            print("filter: created<=" + filtervalue)
            self.queryset = self.queryset.filter(
                created__lte=datetime.strptime(filtervalue + " 23:59:59", '%Y-%m-%d %H:%M:%S'))

        return super().list(request)

    @action(detail=False)
    def availableMemes(self, request):
        available = Meme.objects.filter(Q(owner=request.user) | Q(private=False)).order_by('-created').values('id')
        return JsonResponse(list(available), safe=False)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.views = obj.views + 1
        obj.save(update_fields=("views",))
        return super().retrieve(request, *args, **kwargs)


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
        m = Meme.objects.filter(id=int(self.request.data.get("meme")))[0]
        m.n_comments += 1
        m.save()

        serializer.save(owner=self.request.user)


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
        if self.request.data.get("upvote"):
            m = Meme.objects.filter(id=int(self.request.data.get("meme")))[0]
            m.pos_votes += 1
            m.save()

        serializer.save(owner=self.request.user)

    # permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]


class MemeTemplate:
    available_meme_templates = []

    @classmethod
    def get_available_meme_templates(cls):
        if not cls.available_meme_templates:
            t = list(Template.objects.all().values_list())
            for elem in t:
                cls.available_meme_templates.append(elem)

        return cls.available_meme_templates

    @classmethod
    def get_all_meme_templates(cls, request):

        return JsonResponse(cls.get_available_meme_templates(), safe=False)

    @classmethod
    def get_meme_template(cls, request):
        if not cls.available_meme_templates:
            cls.get_available_meme_templates()
        id = int(request.GET.get('id'))
        resp = cls.available_meme_templates[id]

        return JsonResponse(resp, safe=False)


class MemeCreation:
    default_font_size = 30
    font_default = 'Ubuntu-M.ttf'
    font_bold = 'Ubuntu-B.ttf'
    font_italic = 'Ubuntu-MI.ttf'
    font_bold_italic = 'Ubuntu-BI.ttf'
    font_style_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'media/fonts')

    @classmethod
    def create_meme(cls, request):
        template_name = request.GET.get('templateName')
        if template_name is None:
            return JsonResponse({'message': 'missing \'templateName\' in query params'}, status=400)

        meme_template = Template.objects.filter(title=template_name).values('image_string')[0]['image_string']
        if meme_template is None:
            return JsonResponse({'message': 'meme template could not be found'}, status=400)

        # rp is short for request parameters
        qp = cls.get_query_parameters(request)
        base64_decoded = base64.b64decode(meme_template)
        img = Image.open(io.BytesIO(base64_decoded))
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
        meme_template = Template.objects.filter(title=template_name).values('image_string')[0]['image_string']
        if meme_template is None:
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

                        base64_decoded = base64.b64decode(meme_template)
                        img = Image.open(io.BytesIO(base64_decoded))
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
            return os.path.join(FONT_STYLE_PATH, font_style)

        try:
            font_size = int(request.GET.get('fontSize'))
        except (ValueError, TypeError):
            font_size = DEFAULT_FONT_SIZE

        bold = request.GET.get('bold')
        italic = request.GET.get('italic')
        underline = request.GET.get('underline')

        if bold in ["True", "true"] and italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_BOLD_ITALIC), font_size)
        elif bold in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_BOLD), font_size)
        elif italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_ITALIC), font_size)
        else:
            font = ImageFont.truetype(get_font_style_path(FONT_DEFAULT), font_size)

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
        random = randint(0, 100)

        x = imgflip_response.json()['data']['memes'][random]
        width, height = x['width'], x['height']
        image_to_load = requests.get(x['url'])
        string_image = str(base64.b64encode(image_to_load.content).decode("utf-8"))
        # uri = ("data:" +
        #        image_to_load.headers['Content-Type'] + ";" +
        #        "base64," +

        png_bytes_io = io.BytesIO(base64.b64decode(string_image))
        img = Image.open(png_bytes_io)
        bytes_io_open = io.BytesIO()
        img.save(bytes_io_open, 'PNG')
        res = str(base64.b64encode(bytes_io_open.getvalue()))

        if image_to_load.status_code == 200:
            return JsonResponse({'img': res[2:-1], 'width': width, 'height': height}, safe=False)


class LoadImage:
    @action(detail=False)
    def load_img(request):
        encoded_url = request.GET.get('url')
        if encoded_url is not None and encoded_url != '':
            url = urllib.parse.unquote(encoded_url)
            response = requests.get(url)
            print(response)
            if response.status_code == 200:
                x = response.content
                print(x)

                string_image = str(base64.b64encode(x).decode("utf-8"))
                print(string_image)
                png_bytes_io = io.BytesIO(base64.b64decode(string_image))
                img = Image.open(png_bytes_io)
                bytes_io_open = io.BytesIO()
                img.save(bytes_io_open, 'PNG')
                res = str(base64.b64encode(bytes_io_open.getvalue()))
                print(res)

            return JsonResponse({'img': res[2:-1]}, safe=False)
            # return HttpResponse('OK')


class SendStatistics:
    @action(detail=False)
    def send_statisticis(self):
        top_five_memes = list(Meme.objects.values('id', 'title'
                                                  , 'views').order_by('-views')[:5])
        return JsonResponse(top_five_memes, safe=False)

    def send_userStatistics(self):
        user_database = list(User.objects
                             .annotate(date=TruncDay('last_login'), )
                             .values('date')
                             .annotate(count=Count('date'),
                                       day=Day('last_login'),
                                       month=Month('last_login'),
                                       year=Year('last_login'))
                             .values('day', 'month', 'year', 'date', 'count'))
        return JsonResponse(user_database, safe=False)

    @action(detail=False)
    def send_viewStatistics(request):
        meme_id = int(request.GET.get("meme", ""))
        votes = Vote.objects.filter(meme=meme_id).count()
        views = list(Meme.objects.filter(id=meme_id).values('views'))[0]

        all_views = Meme.objects.aggregate(Sum('views'))
        all_votes = Vote.objects.count()
        print(all_votes)
        return JsonResponse({'votes': votes, 'votes_all': all_votes, 'views': views, 'views_all': all_views})


class TemplateStats:

    @csrf_exempt
    def update_stats(request):
        post_data = request.POST
        template_id = post_data.get("t_id")
        created = post_data.get("isCreated")
        meme_id = post_data.get("m_id")
        t_entry = TemplatesOvertime()
        t_entry.template = list(Template.objects.filter(id=template_id))[0]
        m = list(Meme.objects.filter(id=meme_id))
        if m != []:
            t_entry.meme = list(Meme.objects.filter(id=meme_id))[0]
        t_entry.used = created == "true"
        print(t_entry.used)
        t_entry.save()

        return HttpResponse(200)

    @action(detail=False)
    def get_stats(request):
        filtered_obj = list(TemplatesOvertime.objects
                            .filter(used=True)
                            .values('used', 'template_id', 'template_id__title', 'used')
                            .annotate(_count=Count('used'))
                            .order_by('template_id'))

        filtered_obj_viewed = list(TemplatesOvertime.objects
                                   .filter(used=False)
                                   .values('used', 'template_id', 'template_id__title', 'used')
                                   .annotate(_count=Count('used'))
                                   .order_by('template_id'))



        res = {'created': filtered_obj, 'viewed': filtered_obj_viewed}

        return JsonResponse(res)


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

        file = Path('media/videoMedia/my_video.webm')

        v = list(VideoCreation.objects.all())
        if v == []:
            VideoCreation.objects.create(is_video_creation_running=False)
            v = list(VideoCreation.objects.all())
        v = v[0]
        val = Meme.objects.values().count()
        if val > 5:
            val = 5
        if val < 5 and val > 1:
            val = val

        if val == 1:
            top_five_memes = Meme.objects.values().order_by('-views')[0]
            # top_five_memes = Meme.objects.filter(type=0).values().order_by('-views')[0]
            x = [top_five_memes['id']]
        else:
            top_five_memes = Meme.objects.values().order_by('-views')[:val]
            # top_five_memes = Meme.objects.filter(type=0).values().order_by('-views')[:val]
            x = list(top_five_memes.values_list('id', flat=True))
        if val == 1:
            top_five = [0]
        else:
            top_five = list(range(0, val))

        y = list(TopFiveMemes.objects.all().values_list('top_five_memes', flat=True))

        '''
        Check most views changes
        '''
        if (x != y):

            for i in top_five:

                obj = Meme.objects.get(id=x[i])
                if len(list(TopFiveMemes.objects.all())) < len(x):
                    t = TopFiveMemes(top_five_memes=obj)
                    t.save()
                t = TopFiveMemes.objects.all()[i]
                t.top_five_memes = obj
                t.save()

        if (len(x) or len(y)) == 0:
            return JsonResponse({'type': 1, 'res': 'There are no Memes to show yet;\n'
                                                   'Later there will be a video made up of the top most viewed Memes'},
                                safe=False)
        if (len(x) or len(y)) == 1:
            do_create(v, top_five_memes, val)
            return JsonResponse({'type': 3, 'res': '/media/videoMedia/post.png'})
        if not file.is_file():
            if not v.is_video_creation_running and (x == y):
                do_create(v, top_five_memes, val)
                return JsonResponse({'type': 0, 'res': '/media/videoMedia/my_video.webm'}, safe=False)
            elif not v.is_video_creation_running and (x != y):
                do_create(v, top_five_memes, val)
                return JsonResponse({'type': 0, 'res': '/media/videoMedia/my_video.webm'}, safe=False)
            else:
                return JsonResponse({'type': 2, 'res': 'Error'}, safe=False)
        elif not v.is_video_creation_running and (x != y):
            do_create(v, top_five_memes, val)
            return JsonResponse({'type': 0, 'res': '/media/videoMedia/my_video.webm'}, safe=False)

        else:
            return JsonResponse({'type': 0, 'res': '/media/videoMedia/my_video.webm'}, safe=False)


def load_images(top_five_memes, val):
    if val > 1:
        vlqs = top_five_memes.values_list('image_string', flat=True)
    else:
        vlqs = [top_five_memes['image_string']]
    return vlqs


def images_to_video(top_five_memes, val):
    vlqs = load_images(top_five_memes, val)
    image_dict = {}
    count = 0
    for img in vlqs:
        base64_decoded = base64.b64decode(img[22:])
        image = Image.open(io.BytesIO(base64_decoded))
        image_np = np.array(image, dtype='uint8')
        open_cv_image = resize(image_np, (300, 500))
        image_dict[count] = open_cv_image * 255
        count += 1
        print(count)

    framerate = 25
    img = image_dict.get(0)

    if count > 1:
        print('yes')
        clips = [ImageClip(v).set_duration(5) for k, v in image_dict.items()]
        concat_clip = concatenate_videoclips(clips, method="compose")
        concat_clip.write_videofile('media/videoMedia/my_video.webm', fps=framerate)
    else:
        b, g, r, a = np.dsplit(img, img.shape[-1])
        retval, buffer = cv2.imencode('.png', np.dstack((r, g, b, a)))

        # Write to a file to show conversion worked
        with open('media/videoMedia/post.png', 'wb') as f_output:
            f_output.write(buffer)


def do_create(v, top_five_memes, val):
    v.is_video_creation_running = True
    v.save()
    images_to_video(top_five_memes, val)
    v.is_video_creation_running = False
    v.save()


class VideoTemplates(viewsets.ModelViewSet):
    video_folder = 'media/videoMedia/'

    @classmethod
    def upload_video_to_server(cls, request):
        body = json.loads(request.body)
        video_string = body['video_string'].split(';base64,')[-1]

        bytes_io = io.BytesIO()
        bytes_io.write(base64.b64decode(video_string))
        bytes_io.seek(0)
        video_bytes = bytes_io.read()

        random_name = uuid.uuid4().hex
        video_file_path = os.path.join(cls.video_folder, random_name + '.webm')

        # video needs to be stored locally, because cv2.VideoCapture does not work with buffer
        with open(video_file_path, 'wb') as f:
            f.write(video_bytes)

        images = []

        vidcap = cv2.VideoCapture(video_file_path)
        fps = vidcap.get(cv2.CAP_PROP_FPS)

        frame_counter = 0
        success, image_as_np_array = vidcap.read()
        while success:
            frame_counter += 1
            image = Image.fromarray(image_as_np_array)
            images.append(cv2.cvtColor(np.array(image, dtype='uint8'), cv2.COLOR_BGR2RGB))
            success, image_as_np_array = vidcap.read()

        clips = ImageSequenceClip(images, fps=fps)
        clips.write_videofile(video_file_path, fps=fps)

        return JsonResponse({'video_url': video_file_path, 'frames': frame_counter}, safe=False, status=200)

    @classmethod
    def add_text_to_video(cls, request):
        body = json.loads(request.body)

        video_file_url = body['video_url']
        text_to_add = body['text']
        x_center_in_percent = body['x_center_in_percent']
        y_center_in_percent = body['y_center_in_percent']
        from_frame = body['from_frame']
        to_frame = body['to_frame']

        vidcap = cv2.VideoCapture(video_file_url)
        fps = vidcap.get(cv2.CAP_PROP_FPS)

        os.remove(video_file_url)

        images = []

        frame_counter = 0

        success, image_as_np_array = vidcap.read()

        image_height, image_width, _ = image_as_np_array.shape
        image_draw = ImageDraw.Draw(Image.fromarray(image_as_np_array))
        font_data = cls.get_font_data_from_body(body, image_width, image_draw)

        x_pos_center = image_width * x_center_in_percent
        y_pos_center = image_height * y_center_in_percent

        while success:
            image_as_np_array = cv2.cvtColor(image_as_np_array, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image_as_np_array)

            if (from_frame <= frame_counter) and (frame_counter <= to_frame):
                image_draw = ImageDraw.Draw(image)
                cls.draw_text(image_draw, text_to_add, x_pos_center, y_pos_center, font_data)

            images.append(np.array(image, dtype='uint8'))

            success, image_as_np_array = vidcap.read()

            frame_counter += 1

        clips = ImageSequenceClip(images, fps=fps)
        clips.write_videofile(video_file_url, fps=fps)

        return JsonResponse({'video_url': video_file_url, 'frames': frame_counter}, safe=False, status=200)

    @classmethod
    def draw_text(cls, image_draw, text, x_pos_center, y_pos_center, qp):
        text_width, text_height = ImageDraw.ImageDraw.textsize(image_draw, text, qp.get('font'))
        ascent, descent = qp.get('font').getmetrics()
        image_draw.text((x_pos_center - text_width / 2, y_pos_center - text_height / 2), text,
                        fill=qp.get('fill_color'), font=qp.get('font'))
        if qp.get('underline') in ["True", "true", True]:
            image_draw.line(((x_pos_center - text_width / 2, y_pos_center + ascent - text_height / 2),
                             (x_pos_center + text_width / 2, y_pos_center + ascent - text_height / 2)),
                            fill=qp.get('fill_color'),
                            width=int(qp.get('font_size') / 10))

    @classmethod
    def get_font_data_from_body(cls, body, image_width, image_draw):
        expected_text_width = image_width * body['width_in_percent']

        def get_font_style_path(font_style):
            return os.path.join(FONT_STYLE_PATH, font_style)

        bold = body['bold']
        italic = body['italic']
        underline = body['underline']

        if bold in ["True", "true", True] and italic in ["True", "true", True]:
            font_style = get_font_style_path(FONT_BOLD_ITALIC)
        elif bold in ["True", "true", True]:
            font_style = get_font_style_path(FONT_BOLD)
        elif italic in ["True", "true", True]:
            font_style = get_font_style_path(FONT_ITALIC)
        else:
            font_style = get_font_style_path(FONT_DEFAULT)

        font_size = 0
        font = ImageFont.truetype(font_style, font_size)
        text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, body['text'], font)
        while text_width < expected_text_width:
            font_size += 1
            font = ImageFont.truetype(font_style, font_size)
            text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, body['text'], font)

        try:
            fill_color = tuple(int(body['text_color'][i:i + 2], 16) for i in (1, 3, 5))
        except (ValueError, TypeError):
            fill_color = (0, 0, 0)

        return {'font_size': font_size, 'font': font, 'fill_color': fill_color, 'underline': underline}
