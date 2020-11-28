import {User} from './User';

export class Meme {
  id: number;
  owner: User;
  imageString: string;
  creation: string;
  private: boolean;
}
