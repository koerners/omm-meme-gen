import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Meme} from '../Meme';

@Injectable()
export class MemeService {

  constructor(private http: HttpClient) {
  }

  getAll(): any {
    return this.http.get(environment.apiUrl + '/memes/');
  }

  saveMeme(meme: Meme): void {
    this.http.post(environment.apiUrl + '/memes/', {
      title: meme.title,
      image_string: meme.imageString
    }).subscribe(data => {
      console.log(data);
    });
  }

  loadMeme(id: string): any {
    return this.http.get(environment.apiUrl + '/memes/' + String(id));

  }

}
