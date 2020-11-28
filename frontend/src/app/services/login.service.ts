import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {User} from '../User';
import {Router} from '@angular/router';
import {environment} from '../../environments/environment';

class AuthToken {
  access: string;
  refresh: string;
}

@Injectable()
export class LoginService {

  constructor(private http: HttpClient, private router: Router) {
  }

  login(user: User) {
    this.get_token(user).subscribe((data: AuthToken) => {
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
      this.router.navigate(['/dashboard']);
    });
  }

  get_token(user: User) {
    return this.http.post(environment.apiUrl + '/api/token/', {username: user.email, password: user.password});
  }

}
