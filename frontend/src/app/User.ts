import {Meme} from './Meme';

export class User {
  id: number;
  username: string;
  email?: string;
  password?: string;
  memes?: Meme[];
}
