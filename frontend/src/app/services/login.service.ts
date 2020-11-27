import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

class AuthToken {
  access: string;
  refresh: string;
}

@Injectable()
export class LoginService {

  constructor(private http: HttpClient) {
  }

  login(authData) {
    this.get_token({}).subscribe((data: AuthToken) => {
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
    });
  }

  get_token(data) {
    data = {username: 'admin', password: 'admin'};
    return this.http.post('http://127.0.0.1:8000/api/token/', data);
  }

}
