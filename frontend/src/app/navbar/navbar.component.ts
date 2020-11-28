import {Component} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {LoginService} from '../services/login.service';
import {User} from '../User';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );
  title = 'Meme Generator';
  isLoggedIn = false;
  loggedOnUser: User;

  constructor(private breakpointObserver: BreakpointObserver, private loginService: LoginService) {
    if (localStorage.getItem('access') !== null) {
      this.isLoggedIn = true;
    }
    this.loginService.logOnStatusChange.subscribe(value => {
      this.isLoggedIn = value;
    });

    this.loginService.userStatusChange.subscribe((user: User) => {
      this.loggedOnUser = user;
    });

    this.loginService.updateUser();
  }

  logOut(): void {
    localStorage.removeItem('access');
    this.loginService.toggleLogin(false);
    this.loginService.updateUser();

  }
}
