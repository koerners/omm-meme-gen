import {AfterViewInit, Component, Input, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {fromEvent} from 'rxjs';
import {pairwise, switchMap, takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.css']
})
export class GeneratorComponent implements AfterViewInit {

  textTop = new FormControl('');

  name = new FormControl('');
  textBottom = new FormControl('');

  constructor() {
  }

  @ViewChild('preview', {static: false}) previewCanvas;
  @Input() public width = 600;
  @Input() public height = 700;

  private cx: CanvasRenderingContext2D;


  public ngAfterViewInit(): void {
    const canvasEl: HTMLCanvasElement = this.previewCanvas.nativeElement;
    this.cx = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.cx.lineWidth = 3;
    this.cx.lineCap = 'round';
    this.cx.strokeStyle = '#000';

    this.captureEvents(canvasEl);
  }

  selectFile(event: any): void {
    if (!event.target.files[0] || event.target.files[0].length === 0) {
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
        ctx.drawImage(img, 0, 100, 600, 500);
      };
    };

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
    if (!this.cx) {
      return;
    }

    this.cx.beginPath();

    if (prevPos) {
      this.cx.moveTo(prevPos.x, prevPos.y); // from
      this.cx.lineTo(currentPos.x, currentPos.y);
      this.cx.stroke();
    }
  }

  topChanged(e: Event): void {
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, 50);
    ctx.fillStyle = '#00000';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.textTop.value, canvas.width / 2, 50);
  }

  bottomChanged(e: Event): void {
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, this.height - 100, canvas.width, 50);
    ctx.fillStyle = '#00000';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.textBottom.value, canvas.width / 2, this.height - 50);
  }

  clearCanvas(): void {
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, this.height);
  }

  downloadCanvas(): void {
    const canvas = this.previewCanvas.nativeElement;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'meme.png';
    link.href = image;
    link.click();
  }
}


