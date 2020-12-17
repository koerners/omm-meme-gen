import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Meme} from '../Meme';

@Injectable()
export class MemeService {

  constructor(private http: HttpClient) {
  }

  getAll(): any {
    return this.http.get(environment.apiUrl + '/meme/');
  }

  saveMeme(meme: Meme): void {
    this.http.post(environment.apiUrl + '/meme/', {
      title: meme.title,
      image_string: meme.imageString
    }).subscribe(data => {
      console.log(data);
    });
  }

  loadMeme(id: string): any {
    return this.http.get(environment.apiUrl + '/meme/' + String(id) + '/');
  }

  loadComments(id: string): any {
    return this.http.get(environment.apiUrl + '/comments/comments_by_meme/?meme=' + String(id));
  }

  postComment(id: string, textString: string): any {
    return this.http.post(environment.apiUrl + '/comments/', {
      meme: id,
      text: textString
    });
  }

}
