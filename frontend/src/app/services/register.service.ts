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


  register(data: User): any {
    let payload;
    payload = {username: data.email, password: data.password, email: data.email, last_name: data.username};
    localStorage.removeItem('access');
    return this.http.post(environment.apiUrl + '/users/', payload);

  }

}
