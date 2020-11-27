import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {User} from '../User';

class AuthToken {
  access: string;
  refresh: string;
}

@Injectable()
export class RegisterService {

  constructor(private http: HttpClient) {
  }


  register(data: User) {
    console.log(data);
    data = {username: data.email, password: data.password};
    return this.http.post('http://127.0.0.1:8000/users/', data);
  }

}
