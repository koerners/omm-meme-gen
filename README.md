# omm-meme-gen

To start the backend refer to the README in the backend folder.

To start the frontend refer to the README in the frontend folder.


## API

### Create a single image with bottom/top text

####example:

route: http://127.0.0.1:8000/createMeme/

parameters:

| Key | example value | default value |
|---|---|---|
| templateName | bernieAsking | None and returns status 400 |
| topText | text on top a bit longer | "" |
| bottomText | for your bottom text | "" |
| fontSize | 25 | 30 |
| colorHex | ff8cff | #000000 |
| bold | True | False |
| italic | false | False |
| underline | true | False |

as url: <http://127.0.0.1:8000/createMeme/?templateName=bernieAsking&topText=text%20on%20top%20a%20bit%20longer&bottomText=for%20your%20bottom%20text&fontSize=25&colorHex=ff8cff&bold=True&italic=true&underline=true>

response content_type = 'image/png':   
![alt text](memeExamples/singleImageTopBottomText.png "single image top and bottom text")


### Create a single image with multiple textboxes at chosen locations and text format.

example:

route: http://127.0.0.1:8000/createMeme/

parameters:

| Key | example value | default value |
|---|---|---|
| templateName | bernieAsking | None and returns status 400 |
| topText | text on top a bit longer | "" |
| bottomText | for your bottom text | "" |
| otherTexts | [{"x": 20, "y":200, "text":'mein extra text'}, {'x': 200, 'y': 110, 'text': 'noch anderer text'}] | [] |
| fontSize | 25 | 30 |
| colorHex | ff8cff | #000000 |
| bold | True | False |
| italic | false | False |
| underline | true | False |


as url: <http://127.0.0.1:8000/createMeme/?templateName=bernieAsking&topText=text%20on%20top%20a%20bit%20longer&bottomText=for%20your%20bottom%20text&fontSize=25&colorHex=ff8cff&otherTexts=[{%22x%22:%2020,%20%22y%22:200,%20%22text%22:%27mein%20extra%20text%27},%20{%27x%27:%20200,%20%27y%27:%20110,%20%27text%27:%20%27noch%20anderer%20text%27}]&bold=True&italic=true&underline=true>

response content_type = 'image/png':   
![alt text](memeExamples/singleImageMultipleTexts.png "single image multiple texts")


### Create a set of images (provided as a zip file), e.g. from one image but a list of different texts

example:

route: http://127.0.0.1:8000/createMemes/

parameters:

| Key | example value | default value |
|---|---|---|
| templateName | bernieAsking | None and returns status 400 |
| textLists | [[{"x": 20, "y":200, "text":'mein extra text'}, {'x': 200, 'y': 110, 'text': 'noch anderer text'}], [{'x':10,'y':10,'text':'was los'}, {'bottomText': 'for your bottom text'}]] | [], returns status 400 if malformed |
| fontSize | 25 | 30 |
| colorHex | ff8cff | #000000 |
| bold | True | False |
| italic | false | False |
| underline | true | False |


as url: <http://127.0.0.1:8000/createMemes/?templateName=bernieAsking&fontSize=25&colorHex=ff8cff&textLists=[[{%22x%22:%2020,%20%22y%22:200,%20%22text%22:%27mein%20extra%20text%27},%20{%27x%27:%20200,%20%27y%27:%20110,%20%27text%27:%20%27noch%20anderer%20text%27}],%20[{%27x%27:10,%27y%27:10,%27text%27:%27was%20los%27},%20{%27bottomText%27:%20%27for%20your%20bottom%20text%27}]]&bold=True&italic=true&underline=true>

response content_type = 'application/zip':  
response: zip containing images named meme0.png, meme1.png, ...

