import {User} from './User';

export class Meme {
  id: number;
  owner: User;
  imageString: string;
  created: string;
  private: boolean;
  title: string;
  upvotes: number;
  downvotes: number;
  comments: number;
  liked: boolean;
  voted: boolean;
  views: number;
}
