import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {User} from '../User';
import {environment} from '../../environments/environment';

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
    return this.http.post(environment.apiUrl + '/users/', data);
  }

}
