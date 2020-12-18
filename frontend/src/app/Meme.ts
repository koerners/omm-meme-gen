import {User} from './User';

export class Meme {
  id: number;
  owner: User;
  imageString: string;
  creation: string;
  private: boolean;
  title: string;
  upvotes: number;
  downvotes: number;
  liked: boolean;
  voted: boolean;
}
