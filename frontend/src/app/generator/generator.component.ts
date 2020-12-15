import {AfterViewInit, Component, Input, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {fromEvent} from 'rxjs';
import {pairwise, switchMap, takeUntil} from 'rxjs/operators';
import {ColorEvent} from 'ngx-color';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {MatSelectChange} from '@angular/material/select';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';

@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.css']
})
export class GeneratorComponent implements AfterViewInit {

  textTop = new FormControl('');
  name = new FormControl('');
  textBottom = new FormControl('');
  fontSize = new FormControl('30');
  fontFamily = new FormControl('Arial');
  bold = new FormControl(false);
  italic = new FormControl(false);
  underline = new FormControl(false);

  colorOptions = ['#000000', '#808080', '#C0C0C0', '#FFFFFF', '#800000', '#FF0000', '#808000', '#FFFF00', '#008000', '#00FF00', '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF00FF', '#795548', '#607d8b'];
  colorText: string;
  colorPen: string;
  colorBackground: string;
  @ViewChild('preview', {static: false}) previewCanvas;
  @Input() public width = 600;
  @Input() public height = 700;
  private cx: CanvasRenderingContext2D;

  constructor(private memeService: MemeService) {
    this.colorBackground = '#FFFFFF';
    this.colorText = '#000000';
    this.colorPen = '#000000';
  }

  public ngAfterViewInit(): void {
    const canvasEl: HTMLCanvasElement = this.previewCanvas.nativeElement;
    this.cx = canvasEl.getContext('2d');

    canvasEl.width = this.width;
    canvasEl.height = this.height;

    this.cx.lineWidth = 3;
    this.cx.lineCap = 'round';
    this.cx.strokeStyle = this.colorPen;

    this.captureEvents(canvasEl);
  }

  selectFile(event: any): void {
    // An image is uploaded from the users desktop
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      // if no image
      return;
    }
    const mimeType = event.target.files[0].type;
    if (mimeType.match(/image\/*/) == null) {
      // Check if image
      return;
    }
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();
    // Read in image
    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      const img = new Image();
      img.src = event1.target.result as string;
      img.onload = () => {
        // Image to canvas
        ctx.drawImage(img, 0, 100, 600, 500);
      };
    };

  }

  topChanged(e: Event): void {
    this.updateTopText();
  }

  bottomChanged(e: Event): void {
    this.updateBottomText();
  }

  fontFamilyChanged(e: MatSelectChange): void {
    this.updateTopText();
    this.updateBottomText();
  }

  boldButtonClicked(e: MatButtonToggleChange): void {
    this.bold.setValue(!this.bold.value);
    this.updateTopText();
    this.updateBottomText();
  }

  italicButtonClicked(e: MatButtonToggleChange): void {
    this.italic.setValue(!this.italic.value);
    this.updateTopText();
    this.updateBottomText();
  }

  underlineButtonClicked(e: MatButtonToggleChange): void {
    this.underline.setValue(!this.underline.value);
    this.updateTopText();
    this.updateBottomText();
  }

  updateTopText(): void {
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = this.colorText;

    // font string for bold and italic cause they have to go in ctx.font and dont have an own attribute
    let fontStyle = '';
    fontStyle += this.bold.value ? 'bold ' : '';
    fontStyle += this.italic.value ? 'italic ' : '';
    ctx.font = this.getFontStyle();
    this.getFontStyle();
    ctx.textAlign = 'center';
    ctx.fillText(this.textTop.value, canvas.width / 2, 50);

    // this is to underline the text since there seem to be no text-decorations in canvas
    if (this.underline.value) {
      const {width} = ctx.measureText(this.textTop.value);
      ctx.fillRect((canvas.width / 2 - width / 2), 50, width, this.fontSize.value / 10);
    }
  }

  updateBottomText(): void {
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, this.height - 100, canvas.width, canvas.height);
    ctx.fillStyle = this.colorText;
    ctx.font = this.getFontStyle();
    ctx.textAlign = 'center';
    ctx.fillText(this.textBottom.value, canvas.width / 2, this.height - 50);

    // this is to underline the text since there seem to be no text-decorations in canvas
    if (this.underline.value) {
      const {width} = ctx.measureText(this.textBottom.value);
      ctx.fillRect((canvas.width / 2 - width / 2), this.height - 50, width, this.fontSize.value / 10);
    }
  }

  getFontStyle(): string {
    // font string for bold and italic cause they have to go in ctx.font and dont have an own attribute
    let fontStyle = '';
    fontStyle += this.bold.value ? 'bold ' : '';
    fontStyle += this.italic.value ? 'italic ' : '';
    fontStyle += this.fontSize.value + 'px ';
    fontStyle += this.fontFamily.value;
    return fontStyle;
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

  textColorChanged($event: ColorEvent): void {
    this.colorText = $event.color.hex;
  }

  penColorChanged($event: ColorEvent): void {
    this.colorPen = $event.color.hex;
    const canvas = this.previewCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = this.colorPen;
  }

  backgroundColorChanged($event: ColorEvent): void {
    this.colorBackground = $event.color.hex;
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

  saveCanvas(): void {
    const canvas = this.previewCanvas.nativeElement;
    const image = canvas.toDataURL('image/png');
    const meme = new Meme();
    meme.imageString = image;
    meme.private = true;
    meme.title = this.name.value;
    this.memeService.saveMeme(meme);

  }

  saveCanvasAsDraft(): void {

  }
}


