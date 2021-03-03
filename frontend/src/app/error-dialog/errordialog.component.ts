import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './errordialog.component.html'
})
export class ErrorDialogComponent {
  title = 'Angular-Interceptor';

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private router: Router) {
    console.log(data);
    if (data.reason === 'Unauthorized'){
      this.router.navigate(['./register/']);
    }
    if (data.status.length > 500){
      data.status = 'Error message too long';
    }
  }
}
