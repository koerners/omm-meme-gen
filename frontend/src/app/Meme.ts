import {User} from './User';

export class Meme {
  id: number;
  owner: User;
  imageString: string;
  created: string;
  private: boolean;
  title: string;
  textConcated: string;
  upvotes: number;
  downvotes: number;
  liked: boolean;
  voted: boolean;
  views: number;
  type: number;
  // tslint:disable-next-line:variable-name
  n_comments: number;
  // tslint:disable-next-line:variable-name
  pos_votes: number;
}
