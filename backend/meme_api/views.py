from django.contrib.auth.models import User, Group
from django.http import JsonResponse, HttpResponse
from rest_framework import generics
from rest_framework import permissions
from rest_framework import viewsets
from rest_framework import views
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
import cv2
import sys
from django.core.files.base import ContentFile
import uuid
import numpy as np

from backend.settings import BASE_DIR
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


class MemeTemplate(viewsets.ModelViewSet):
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

        if imgflip_response.status_code == 200:
            return HttpResponse(imgflip_response)


class VideoTemplates(viewsets.ModelViewSet):
    video_folder = 'media/videos/'

    @classmethod
    def upload_video_to_server(cls, request):
        body = json.loads(request.body)
        video_string = body['video_string'].split(';base64,')[-1]

        bytes_io = io.BytesIO()
        bytes_io.write(base64.b64decode(video_string))
        bytes_io.seek(0)
        video_bytes = bytes_io.read()

        random_name = uuid.uuid4().hex
        video_file_name = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), cls.video_folder, random_name + '.mp4');

        # video needs to be stored locally, because cv2.VideoCapture does not work with buffer
        with open(video_file_name, 'wb') as f:
            f.write(video_bytes)

        vidcap = cv2.VideoCapture(video_file_name)
        fps = vidcap.get(cv2.CAP_PROP_FPS)

        # # here we can delete the video file from the server again
        # os.remove(video_file_name)
        #
        # images = []
        #
        # success, image_as_np_array = vidcap.read()
        # while success:
        #     image_as_np_array = cv2.cvtColor(image_as_np_array, cv2.COLOR_BGR2RGB)
        #     image = Image.fromarray(image_as_np_array)
        #
        #     # convert image to base64 to make it json serializable
        #     image_bytes = io.BytesIO()
        #     image.save(image_bytes, format='JPEG')
        #     im_data = image_bytes.getvalue()
        #     base64_bytes = base64.b64encode(im_data)
        #     image_string = 'data:image/jpg;base64,' + base64_bytes.decode('utf-8')
        #
        #     images.append(image_string)
        #     success, image_as_np_array = vidcap.read()
        #
        # return JsonResponse({'video_file_name': random_name, 'frames': len(images)}, safe=False, status=200)

        frame_counter = 0
        success, image_as_np_array = vidcap.read()
        while success:
            frame_counter += 1
            success, image_as_np_array = vidcap.read()

        return JsonResponse({'video_file_name': video_file_name, 'frames': frame_counter, 'video_string': video_string},
                            safe=False, status=200)

    @classmethod
    def add_text_to_video(cls, request):
        body = json.loads(request.body)

        # with open(body['video_file_name'], 'wb') as f:
        #     f.write(video_bytes)

        video_file_name = body['video_file_name']
        text_to_add = body['text']
        x_pos = body['x']
        y_pos = body['y']
        font_size = body['font_size']
        from_frame = body['from_frame']
        to_frame = body['to_frame']
        underline = body['underline']
        bold = body['bold']

        vidcap = cv2.VideoCapture(body['video_file_name'])
        fps = vidcap.get(cv2.CAP_PROP_FPS)

        images = []

        frame_counter = 0

        success, image_as_np_array = vidcap.read()

        while success:
            image_as_np_array = cv2.cvtColor(image_as_np_array, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image_as_np_array)

            if (from_frame <= frame_counter) and (frame_counter <= to_frame):
                image_draw = ImageDraw.Draw(image)
                cls.draw_text(image_draw, text_to_add, x_pos, y_pos, cls.get_font_data_from_body(body))

            images.append(image)

            success, image_as_np_array = vidcap.read()

            frame_counter += 1


        width, height = images[0].size

        print('width and height', width, height)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(video_file_name,
                                 fourcc,
                                 fps=fps,
                                 frameSize=(width, height))

        for image in images[:100]:
            opencv_image = np.array(image)
            opencv_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2RGB)
            writer.write(opencv_image)

        with open(video_file_name, "rb") as vid_file:
            base64_bytes = base64.b64encode(vid_file.read())
            video_string = base64_bytes.decode('utf-8')

        return JsonResponse(
            {'video_file_name': video_file_name, 'frames': frame_counter, 'video_string': video_string},
            safe=False, status=200)

    @classmethod
    def get_video_from_images(cls, request):
        body = json.loads(request.body)
        fps = body['video_data']['fps']
        images = body['video_data']['images']

        random_name = uuid.uuid4().hex
        video_file_name = random_name + '.mp4'

        pil_image = Image.open(io.BytesIO(base64.b64decode(images[0].split(';base64,')[-1])))
        width, height = pil_image.size

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(video_file_name,
                                 fourcc,
                                 fps=fps,
                                 frameSize=(width, height))

        counter = 0
        for image in images:
            if counter == 0:
                blub = Image.open(io.BytesIO(base64.b64decode(image.split(';base64,')[-1])))
                blub.save('test.png', 'PNG')
            pil_image = Image.open(io.BytesIO(base64.b64decode(image.split(';base64,')[-1])))
            opencv_image = np.array(pil_image)
            opencv_image = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2RGB)
            writer.write(opencv_image)
            counter += 1

        cv2.destroyAllWindows()
        writer.release()

        video_bytes = io.BytesIO()
        with open(video_file_name, 'rb') as f:
            video_bytes.write(f.read())

        pil_image = Image.open('test.png')
        response = HttpResponse(content_type='image/png')

        pil_image.save(response, 'PNG')

        return response

        # print('before creating response')
        # response = HttpResponse(video_bytes.getvalue(), content_type='video/x-msvideo')
        # response['Content-Disposition'] = "attachment; filename=" + video_file_name
        # response['Content-Length'] = len(video_file_name)
        # print('after creating response')
        #
        # return response

    @classmethod
    def draw_text(cls, image_draw, text, x, y, qp):
        text_width, _ = ImageDraw.ImageDraw.textsize(image_draw, text, qp.get('font'))
        ascent, _ = qp.get('font').getmetrics()
        image_draw.text((x, y), text, fill=qp.get('fill_color'), font=qp.get('font'))
        if qp.get('underline') in ["True", "true"]:
            image_draw.line(((x, y + ascent), (x + text_width, y + ascent)), fill=qp.get('fill_color'),
                            width=int(qp.get('font_size') / 10))

    @classmethod
    def get_font_data_from_body(cls, body):
        def get_font_style_path(font_style):
            return os.path.join(FONT_STYLE_PATH, font_style)

        try:
            font_size = int(body['font_size'])
        except (ValueError, TypeError):
            font_size = DEFAULT_FONT_SIZE

        bold = body['bold']
        italic = body['italic']
        underline = body['underline']

        if bold in ["True", "true"] and italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_BOLD_ITALIC), font_size)
        elif bold in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_BOLD), font_size)
        elif italic in ["True", "true"]:
            font = ImageFont.truetype(get_font_style_path(FONT_ITALIC), font_size)
        else:
            font = ImageFont.truetype(get_font_style_path(FONT_DEFAULT), font_size)

        try:
            fill_color = tuple(int(body['text_color'][i:i + 2], 16) for i in (0, 2, 4))
        except (ValueError, TypeError):
            fill_color = (0, 0, 0)

        return {'font_size': font_size, 'font': font, 'fill_color': fill_color, 'underline': underline}
