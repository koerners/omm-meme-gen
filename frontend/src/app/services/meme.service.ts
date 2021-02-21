import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {Meme} from '../Meme';

/**
 * MemeSerivce Class
 *
 * Allows communication between Frontend and Backend
 */
@Injectable()
export class MemeService {
  /**
   * MemeService
   * @param http HttpClient
   */
  constructor(private http: HttpClient) {
  }

  /**
   * retrieves all memes stored in the database
   */
  getAll(): any {
    return this.http.get(environment.apiUrl + '/meme/');
  }

  /**
   * Retrieves any given URL
   * @param url the url to retrieve
   */
  paginator(url: string): any {
    return this.http.get(url + '');
  }

  /**
   * retrieve the memes generated owned by the active account
   */
  getOwn(): any {
    return this.http.get(environment.apiUrl + '/meme/own/');
  }

  /**
   * retrieve all Memetemplates stored in the backend
   */
  getAllMemeTemplates(): any {
    return this.http.get(environment.apiUrl + '/memeTemplates/');
  }

  /**
   *
   * TODO: write doc
   * @param templateName the template name
   */
  getMemeTemplateByString(templateName: string): any {
    this.http.get(environment.apiUrl + '/memeTemplate/?name=' + templateName)
      .subscribe(template => {
        console.log('meme template:', template);
        return template;
      });
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
  saveMeme(meme: Meme): void {
    this.http.post(environment.apiUrl + '/meme/', {
      title: meme.title,
      image_string: meme.imageString, private: meme.private
    }).subscribe(data => {
      console.log(data);
    });
  }

  /**
   * load a meme by its ID
   * @param id the ID used to identify the generated meme
   */
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

  loadStatistics(): any{
    return this.http.get(environment.apiUrl + '/statistics/');
  }
  loadUserStats(): any{
    return this.http.get(environment.apiUrl + '/userStats/');
  }

  loadTopMemeVideo(): any{
    return this.http.get(environment.apiUrl + '/memeVideo/');
  }
}
