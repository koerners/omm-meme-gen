import {Component, Inject} from "@angular/core";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {DialogData} from "../generator/generator.component";

@Component({
    selector: 'app-input-url-dialog',
    templateUrl: './input-url-dialog.html',
})
export class InputUrlDialogComponent {

    constructor(
        public dialogRef: MatDialogRef<InputUrlDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData) {
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

}
