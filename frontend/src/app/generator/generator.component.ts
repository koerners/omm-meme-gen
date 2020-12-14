import {AfterViewInit, Component, Input, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {fromEvent} from 'rxjs';
import {pairwise, switchMap, takeUntil} from 'rxjs/operators';
import {ColorEvent} from 'ngx-color';

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.css']
})
export class GeneratorComponent implements AfterViewInit {

  textTop = new FormControl('');

  name = new FormControl('');
  textBottom = new FormControl('');

  colorOptions = ['#000000', '#808080', '#C0C0C0', '#FFFFFF', '#800000', '#FF0000', '#808000', '#FFFF00', '#008000', '#00FF00', '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF00FF', '#795548', '#607d8b'];
  colorText: string;
  colorPen: string;
  colorBackground: string;
  @ViewChild('previewBackground', {static: false}) backgroundCanvas;
  @ViewChild('previewText', {static: false}) textAndDrawCanvas;
  @Input() public width = 600;
  @Input() public height = 700;

  constructor() {
    this.colorBackground = '#FFFFFF';
    this.colorText = '#000000';
    this.colorPen = '#000000';
  }

  public ngAfterViewInit(): void {
    const canvasBackgroundEl: HTMLCanvasElement = this.backgroundCanvas.nativeElement;
    canvasBackgroundEl.width = this.width;
    canvasBackgroundEl.height = this.height;
    const ctx = canvasBackgroundEl.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, canvasBackgroundEl.width, canvasBackgroundEl.height);

    this.captureEvents(canvasBackgroundEl);

    const canvasTextAndDrawEl: HTMLCanvasElement = this.textAndDrawCanvas.nativeElement;
    const canvasTextAndDrawCtx = canvasTextAndDrawEl.getContext('2d');

    canvasTextAndDrawEl.width = this.width;
    canvasTextAndDrawEl.height = this.height;
    canvasTextAndDrawCtx.lineWidth = 3;
    canvasTextAndDrawCtx.lineCap = 'round';
    canvasTextAndDrawCtx.strokeStyle = this.colorPen;

    this.captureEvents(canvasTextAndDrawEl);
  }

  selectFile(event: any): void {
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      return;
    }
    const mimeType = event.target.files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
    const canvas = this.backgroundCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();

    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      console.log(event1);
      const img = new Image();
      img.src = event1.target.result as string;
      img.onload = () => {
        ctx.drawImage(img, 0, 100, 600, 500);
      };
    };

  }

  topChanged(e: Event): void {
    const canvas = this.textAndDrawCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, 50);
    ctx.fillStyle = this.colorText;
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.textTop.value, canvas.width / 2, 50);
  }

  bottomChanged(e: Event): void {
    const canvas = this.textAndDrawCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, this.height - 100, canvas.width, 50);
    ctx.fillStyle = this.colorText;
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.textBottom.value, canvas.width / 2, this.height - 50);
  }

  clearCanvas(): void {
    this.colorBackground = '#FFFFFF';
    let canvas = this.backgroundCanvas.nativeElement;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    canvas = this.textAndDrawCanvas.nativeElement;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, this.height);
  }

  downloadCanvas(): void {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.backgroundCanvas.nativeElement, 0, 0);
    ctx.drawImage(this.textAndDrawCanvas.nativeElement, 0, 0);

    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'meme.png';
    link.href = image;
    link.click();
  }

  textColorChanged($event: ColorEvent): void {
    this.colorText = $event.color.hex;
  }

  penColorChanged($event: ColorEvent): void {
    this.colorPen = $event.color.hex;
    const canvas = this.textAndDrawCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = this.colorPen;
  }

  backgroundColorChanged($event: ColorEvent): void {
    this.colorBackground = $event.color.hex;
    const canvas = this.backgroundCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private captureEvents(canvasEl: HTMLCanvasElement): void {
    // this will capture all mousedown events from the canvas element
    fromEvent(canvasEl, 'mousedown')
      .pipe(
        switchMap((e) => {
          // after a mouse down, we'll record all mouse moves
          return fromEvent(canvasEl, 'mousemove')
            .pipe(
              // we'll stop (and unsubscribe) once the user releases the mouse
              // this will trigger a 'mouseup' event
              takeUntil(fromEvent(canvasEl, 'mouseup')),
              // we'll also stop (and unsubscribe) once the mouse leaves the canvas (mouseleave event)
              takeUntil(fromEvent(canvasEl, 'mouseleave')),
              // pairwise lets us get the previous value to draw a line from
              // the previous point to the current point
              pairwise()
            );
        })
      )
      .subscribe((res: [MouseEvent, MouseEvent]) => {
        const rect = canvasEl.getBoundingClientRect();

        // previous and current position with the offset
        const prevPos = {
          x: res[0].clientX - rect.left,
          y: res[0].clientY - rect.top
        };

        const currentPos = {
          x: res[1].clientX - rect.left,
          y: res[1].clientY - rect.top
        };

        // this method we'll implement soon to do the actual drawing
        this.drawOnCanvas(prevPos, currentPos);
      });
  }

  private drawOnCanvas(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }): void {
    const textAndDrawCanvasCtx = this.textAndDrawCanvas.nativeElement.getContext('2d');

    if (!textAndDrawCanvasCtx) {
      return;
    }


    textAndDrawCanvasCtx.beginPath();

    if (prevPos) {
      textAndDrawCanvasCtx.moveTo(prevPos.x, prevPos.y); // from
      textAndDrawCanvasCtx.lineTo(currentPos.x, currentPos.y);
      textAndDrawCanvasCtx.stroke();
    }
  }
}


