import {Meme} from './Meme';

export class User {
  username: string;
  email?: string;
  password?: string;
  memes?: Meme[];
}
