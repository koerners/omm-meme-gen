import {Component} from '@angular/core';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {Observable} from 'rxjs';
import {map, shareReplay} from 'rxjs/operators';
import {LoginService} from '../services/login.service';

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

  constructor(private breakpointObserver: BreakpointObserver, private loginService: LoginService) {
    if (localStorage.getItem('access') !== null) {
      this.isLoggedIn = true;
    }
    this.loginService.logOnStatusChange.subscribe(value => {
      console.log(value);
      this.isLoggedIn = value;
    });
  }

  logOut() {
    localStorage.removeItem('access');
    this.loginService.toggleLogin(false);

  }
}
