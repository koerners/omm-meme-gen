## Backend for Meme-Gen

- Step 1: Install requirements.txt
- Step 2: Run migrations
````
python manage.py makemigrations
````
- Step 3: Migrate
````
python manage.py migrate
````
-Step 4: Create Admin User (optional)
````
python manage.py createsuperuser
````

## Api-Doc
Available by navigating to URL

## Get Memes as Zip

```
var form = new FormData();
form.append("creation", "2021-01-01,2021-02-01");
form.append("views", "0,0");
form.append("votes", "0,0");
form.append("text", "titel");
form.append("max", "2");

var settings = {
  "url": "http://127.0.0.1:8000/zip/",
  "method": "POST",
  "timeout": 0,
  "processData": false,
  "mimeType": "multipart/form-data",
  "contentType": false,
  "data": form
};

$.ajax(settings).done(function (response) {
  console.log(response);
});
```