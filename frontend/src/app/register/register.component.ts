import {Component} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {ErrorDialogService} from '../error-dialog/errordialog.service';
import {User} from '../User';
import {RegisterService} from '../services/register.service';
import {LoginService} from '../services/login.service';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  addressForm = this.fb.group({
    username: [null],
    email: [null, [Validators.required, Validators.minLength(5), Validators.maxLength(20), Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
    password: [null, [Validators.required, Validators.minLength(5), Validators.maxLength(50)]],
    registered: ['false'],
  });

  private user: User;
  isLogin = true;
  hasRegistered = false;



  // tslint:disable-next-line:max-line-length
  constructor(private fb: FormBuilder, public errorDialogService: ErrorDialogService, public registerService: RegisterService, public loginService: LoginService) {

  }

  register() {
    if (this.addressForm.valid) {
      this.user = new User();
      this.user.username = this.addressForm.value.username;
      this.user.email = this.addressForm.value.email;
      this.user.password = this.addressForm.value.password;
      this.registerService.register(this.user).subscribe((res) => {
        let data = {};
        data = {
          reason: 'Registration Successful',
          status: 'You may log in now'
        };
        this.errorDialogService.openDialog(data);
        this.isLogin = true;
        this.hasRegistered = true;

      });

    } else {
      let data = {};
      data = {
        reason: 'Input not valid',
        status: 'Registration failed'
      };
      this.errorDialogService.openDialog(data);
    }
  }

  login() {
    this.user = new User();
    this.user.email = this.addressForm.value.email;
    this.user.password = this.addressForm.value.password;
    this.loginService.login(this.user);

  }


  updateForm() {
    this.isLogin = (/true/i).test(this.addressForm.getRawValue().registered);
    console.log(this.isLogin);


  }
}



