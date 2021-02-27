import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Meme} from '../Meme';
import { map } from 'rxjs/operators';
import {env} from '@tensorflow/tfjs-core';

/**
 * MemeService Class
 *
 * Allows communication between Frontend and Backend
 */
@Injectable()
export class MemeService {

  currentMemeId: string;

  /**
   * MemeService
   * @param http HttpClient
   */
  constructor(private http: HttpClient) {
  }

  /**
   * retrieves all memes (paginated)
   */
  getAll(): any {
    return this.http.get(environment.apiUrl + '/meme/');
  }

  /**
   * retrieve the memes generated owned by the active account (paginated)
   */
  getOwn(): any {
    return this.http.get(environment.apiUrl + '/meme/own/');
  }

  /**
   * retrieves memes (paginated) with Filter & Sort options
   */
  getMemesSortFilter(own: boolean, sort: string, order: string, filter: string, value: string): any {
    let params = '';
    if (filter === 'search' && value) {
      params += 'search=' + value;
    }
    else if (filter && value) {
      // console.log(filter, value);
      params += 'filter=' + filter + '&value=' + value;
    }
    if (sort) {
      // console.log(sort, order);
      params += (params ? '&' : '') + 'ordering=' + order + sort;
    }
    if (own) {
      return this.http.get(environment.apiUrl + '/meme/own/' + (params ? '?' + params : ''));
    }
    else {
      return this.http.get(environment.apiUrl + '/meme/' + (params ? '?' + params : ''));
    }
  }

  /**
   * Retrieves any given URL
   * @param url the url to retrieve
   */
  paginator(url: string): any {
    return this.http.get(url + '');
  }

  /**
   * retrieve all Memetemplates stored in the backend
   */
  getAllMemeTemplates(): any {
    return this.http.get(environment.apiUrl + '/memeTemplates/');
  }

  /**
   *
   * @param templateName the template name
   */
  getMemeTemplateByString(id: number): any {
    return this.http.get(environment.apiUrl + '/memeTemplate/?id=' + id);
  }

  /**
   * retrieve all the top 100 Images from ImgFlip API
   */
  getMemesFromImgFlip(): any {
    return this.http.get(environment.apiUrl + '/imgFlip/');
  }

  /**
   * save the current meme
   * @param meme the current meme
   */
  saveMeme(meme: Meme): any {
    return this.http.post(environment.apiUrl + '/meme/', {
      title: meme.title,
      text_concated: meme.textConcated,
      image_string: meme.imageString,
      private: meme.private,
      type: meme.type
    });
  }

  convertVideoToImages(videoString: string): any {
    return this.http.post(environment.apiUrl + '/convertVideoToImages/', {
      video_string: videoString
    });
  }

  addTextToVideo(textData: {}): any {
    return this.http.post(environment.apiUrl + '/addTextToVideo/', textData);
  }

  loadMeme(id: string): any {
    return this.http.get(environment.apiUrl + '/meme/' + String(id) + '/');
  }

  /**
   * retrieves all available memes
   */
  availableMemeIds(): any {
    return this.http.get(environment.apiUrl + '/meme/availableMemes/');
  }

  /**
   * Retrieves the comments on a meme
   * @param id the id of the meme
   */
  loadComments(id: string): any {
    return this.http.get(environment.apiUrl + '/comments/comments_by_meme/?meme=' + String(id));
  }

  /**
   * Sends a post request for a comment
   * @param id the comment id
   * @param textString the text to post
   */
  postComment(id: string, textString: string): any {
    return this.http.post(environment.apiUrl + '/comments/', {
      meme: id,
      text: textString
    });
  }

  /**
   * sends a post request for a vote
   * @param id the vote id
   * @param upvoteIn the value of the vote
   */
  vote(id: string, upvoteIn: boolean): any {

    return this.http.post(environment.apiUrl + '/vote/', {
      meme: id,
      upvote: upvoteIn
    });
  }

  /**
   * retrieves the votes for a meme
   * @param id the id of the meme
   */
  loadVotes(id: string): any {
    return this.http.get(environment.apiUrl + '/vote/votes_by_meme/?meme=' + String(id));
  }
  getScreenshotFromUrl(url: string): any{
    return this.http.get(environment.apiUrl + '/screenshotFromUrl/?url=' + url, {responseType: 'text'});
  }
  getImageFrom(url: string): any{
    return this.http.get(environment.apiUrl + '/loadImg/?url=' + url, {responseType: 'json'});
  }

  loadStatistics(): any{
    return this.http.get(environment.apiUrl + '/statistics/');
  }
  loadUserStats(): any{
    return this.http.get(environment.apiUrl + '/userStats/');
  }
  loadMemeStats(id: string): any{
    return this.http.get(environment.apiUrl + '/memeStats/?meme=' + id);
  }

  loadTopMemeVideo(): any{
    return this.http.get(environment.apiUrl + '/memeVideo/');
  }

  getFilteredMemesAsZip(type: string, maxImgs: number, start: any, end?: any ): any {
    const data = new FormData();
    data.append('max', String(maxImgs));
    data.append(String(type), String(start));

    return this.http.post(environment.apiUrl + '/zip/', data, { responseType: 'blob'});
  }


  /**
   * Not nice POST method
   * @param templateID the templateID
   */
  postTemplateStat(templateID: number): any{
    console.log('Doing >>>>' + templateID);
    if (this.currentMemeId == null){
      const data = new FormData();
      data.append('t_id', templateID.toString());
      data.append('isCreated', 'false');

      const xhr = new XMLHttpRequest();
      xhr.withCredentials = false;

      xhr.addEventListener('readystatechange', function(): void {
        if (this.readyState === 4) {
          console.log(this.responseText);
        }
      });

      xhr.open('POST', environment.apiUrl + '/templateStats/');

      xhr.send(data);
    }
    else{
      const data = new FormData();
      data.append('t_id', templateID.toString());
      data.append('m_id', this.currentMemeId.toString());
      data.append('isCreated', 'true');

      const xhr = new XMLHttpRequest();
      xhr.withCredentials = false;

      xhr.addEventListener('readystatechange', function(): void {
        if (this.readyState === 4) {
          console.log(this.responseText);
        }
      });

      xhr.open('POST', environment.apiUrl + '/templateStats/');

      xhr.send(data);
      this.setMemeServiceCurrentMeme(null);
      }
  }

  /**
   * set the meme id if generate, else set null
   * @param id the id of the meme
   */
  setMemeServiceCurrentMeme(id): void{
    this.currentMemeId = id;
  }
}
