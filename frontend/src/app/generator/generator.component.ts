import {Component, OnInit, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.css']
})
export class GeneratorComponent implements OnInit {
  name = new FormControl('');

  @ViewChild('preview', {static: false}) previewCanvas;

  constructor() {
  }

  selectFile(event: any): void {
    if (!event.target.files[0] || event.target.files[0].length == 0) {
      return;
    }
    const mimeType = event.target.files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();

    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      console.log(event1);
      const img = new Image();
      img.src = event1.target.result as string;
      console.log(img);
      img.onload = () => {
        ctx.drawImage(img, 50, 150, 600, 500);
      };
    };

  }

  ngOnInit(): void {
  }

}
