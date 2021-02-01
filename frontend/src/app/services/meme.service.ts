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

  getAllSortFilter(sort: string, order: string, filter: string, value: string): any {
    let params = '';
    if (sort) {
      // console.log(sort, order);
      params += 'sort=' + order + sort;
    }
    if (filter && value) {
      // console.log(filter, value);
      params += (params ? '&' : '') + 'filter=' + filter + '&value=' + value;
    }
    return this.http.get(environment.apiUrl + '/meme/' + (params ? '?' + params : ''));
  }

  paginator(url: string): any {
    return this.http.get(url + '');
  }

  getOwn(): any {
    return this.http.get(environment.apiUrl + '/meme/own/');
  }

  getAllMemeTemplates(): any {
    return this.http.get(environment.apiUrl + '/memeTemplates/');
  }

  getMemeTemplateByString(templateName: string): any {
    this.http.get(environment.apiUrl + '/memeTemplate/?name=' + templateName)
      .subscribe(template => {
        console.log('meme template:', template);
        return template;
      });
  }

  getMemesFromImgFlip(): any {
    return this.http.get(environment.apiUrl + '/imgFlip/');
  }

  saveMeme(meme: Meme): void {
    this.http.post(environment.apiUrl + '/meme/', {
      title: meme.title,
      image_string: meme.imageString, private: meme.private
    }).subscribe(data => {
      console.log(data);
    });
  }

  loadMeme(id: string): any {
    return this.http.get(environment.apiUrl + '/meme/' + String(id) + '/');
  }

  availableMemeIds(): any {
    return this.http.get(environment.apiUrl + '/meme/availableMemes/');
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

  vote(id: string, upvoteIn: boolean): any {
    return this.http.post(environment.apiUrl + '/vote/', {
      meme: id,
      upvote: upvoteIn
    });
  }

  loadVotes(id: string): any {
    return this.http.get(environment.apiUrl + '/vote/votes_by_meme/?meme=' + String(id));
  }
}
