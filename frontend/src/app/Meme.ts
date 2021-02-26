import {User} from './User';

export class Meme {
  id: number;
  owner: User;
  imageString: string;
  creation: string;   // FIXME necessary?
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
}
