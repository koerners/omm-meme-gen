import {FormControl} from '@angular/forms';

export class Textbox {
  formControl: FormControl;
  xPos: number;
  yPos: number;
  fixedPosition: boolean;

  constructor(value: string, xPos: number, yPos: number) {
    this.formControl = new FormControl(value);
    this.xPos = xPos;
    this.yPos = yPos;
    this.fixedPosition = false;
  }
}
