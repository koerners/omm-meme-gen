import {Injectable} from '@angular/core';
import {ErrorDialogComponent} from './errordialog.component';
import {MatDialog} from '@angular/material/dialog';

@Injectable()
export class ErrorDialogService {
  // tslint:disable-next-line:ban-types
  public isDialogOpen: Boolean = false;

  constructor(public dialog: MatDialog) {
  }

  openDialog(data): any {
    if (this.isDialogOpen) {
      return false;
    }
    this.isDialogOpen = true;
    const dialogRef = this.dialog.open(ErrorDialogComponent, {
      width: '300px',
      data
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.isDialogOpen = false;
      let animal;
      animal = result;
    });
  }
}
