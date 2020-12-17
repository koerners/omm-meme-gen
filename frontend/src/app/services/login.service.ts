import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {User} from '../User';
import {Router} from '@angular/router';
import {environment} from '../../environments/environment';
import {Subject} from 'rxjs';

class AuthToken {
  access: string;
  refresh: string;
}

@Injectable()
export class LoginService {
  logOnStatusChange: Subject<boolean> = new Subject<boolean>();
  userStatusChange: Subject<User> = new Subject<User>();

  constructor(private http: HttpClient, private router: Router) {

  }

  toggleLogin(bool): void {
    this.logOnStatusChange.next(bool);
  }


  updateUser(): void {
    this.getUserInfo().subscribe(userInfo => {
      let loginUser;
      loginUser = new User();
      loginUser.username = userInfo.username;
      loginUser.email = userInfo.email;
      loginUser.id = userInfo.id;
      this.userStatusChange.next(loginUser);
    });
  }


  login(user: User): void {
    this.get_token(user).subscribe((data: AuthToken) => {
      localStorage.setItem('access', data.access);
      localStorage.setItem('refresh', data.refresh);
      this.router.navigate(['/dashboard']);
      this.toggleLogin(true);
      this.updateUser();
    });
  }


  get_token(user: User): any {
    return this.http.post(environment.apiUrl + '/api/token/', {username: user.email, password: user.password});
  }

  private getUserInfo(): any {
    return this.http.get(environment.apiUrl + '/users/self/');
  }
}
