import {AfterViewInit, Component, Input, ViewChild, ElementRef} from '@angular/core';
import {FormControl} from '@angular/forms';
import {fromEvent, Subject, Observable, pipe} from 'rxjs';
import {pairwise, switchMap, takeUntil} from 'rxjs/operators';
import {ColorEvent} from 'ngx-color';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {WebcamImage, WebcamInitError} from 'ngx-webcam';
import {MatSelectChange} from '@angular/material/select';
import {MatButtonToggleChange, MatButtonToggleModule} from '@angular/material/button-toggle';
import {Textbox} from '../Textbox';
import {DomSanitizer, SafeResourceUrl, SafeUrl} from '@angular/platform-browser';
import {InputUrlDialogComponent} from '../input-url-dialog/input-url-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {decodeBase64} from "@tensorflow/tfjs-converter/dist/operations/operation_mapper";

/**
 * The interface for the InputDialogData
 */
export interface DialogData {
  url: string;
}


@Component({
  selector: 'app-generator',
  templateUrl: './generator.component.html',
  styleUrls: ['./generator.component.css']
})
export class GeneratorComponent implements AfterViewInit {
  /**
   * The form for the text on the top
   */
  textTop = new FormControl('');
  /**
   * The form for the name of the meme
   */
  name = new FormControl('');
  /**
   * The form for the text on the bottom
   */
  textBottom = new FormControl('');
  /**
   * The form for the font size
   */
  fontSize = new FormControl('30');
  /**
   * The form for the font style
   */
  fontFamily = new FormControl('Arial');
  /**
   * The form for bold text
   */
  bold = new FormControl(false);
  /**
   * The form for italic text
   */
  italic = new FormControl(false);
  /**
   * The form for underlinde text
   */
  underline = new FormControl(false);
  /**
   * Allows drawing on canvas
   */
  drawingMode = false;
  /**
   * The array for storing the textboxes
   */
  textboxes: Textbox[] = [];
  /**
   * The input form for the new textbox
   * @see newTextbox
   */
  yourText = new FormControl('Your text');
  /**
   * a new Textbox
   */
  newTextbox: Textbox;
  /**
   * The previous drawing position
   */
  previousDrawPosition = null;
  /**
   * The row height of MaterialGridTile
   */
  rowHeight = 95;

  memeTemplates: {name, base64_string}[] = [];
  /**
   * The Color options available
   */
  colorOptions: string[] = ['#000000', '#808080', '#C0C0C0', '#FFFFFF', '#800000', '#FF0000', '#808000', '#FFFF00', '#008000', '#00FF00', '#008080', '#00FFFF', '#000080', '#0000FF', '#800080', '#FF00FF', '#795548', '#607d8b'];
  /**
   * The Color of the Text
   */
  colorText: string;
  /**
   * The Color of the Pen
   */
  colorPen: string;
  /**
   * The Color of the Pen
   */
  colorBackground: string;

  /**
   * The camera value wheter it is active or not
   */
  cameraOn = false;
  videoOn = false;
  res = '';

  currentWidth: number;
  currentHeight: number;
  currentlyShownMemeTemplateIndex = -1;

  @ViewChild('preview', {static: false}) previewCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewBackground', {static: false}) backgroundCanvas;
  @ViewChild('previewFile', {static: false}) fileCanvas;
  @ViewChild('previewText', {static: false}) textCanvas;
  @ViewChild('previewTextbox', {static: false}) textboxCanvas;
  @ViewChild('previewDraw', {static: false}) drawCanvas;
  @Input() public width = 500;
  @Input() public height = 700;


  imageToShow: any;
  isImageLoading = false;

  public errors: WebcamInitError[] = [];
  public videoOptions: MediaTrackConstraints = {
     width: {ideal: 1024},
     height: {ideal: 576}
  };
  // latest snapshot
  public webcamImageArray: WebcamImage[];
  public webcamImage: WebcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  url: string;
  posts: any;
  private imagesRecieved: any;
  private randomImageIndex: number;

  constructor(private memeService: MemeService, private sanitizer: DomSanitizer, public dialog: MatDialog) {
    this.colorBackground = '#FFFFFF';
    this.colorText = '#000000';
    this.colorPen = '#000000';

    this.currentWidth = this.width;
    this.currentHeight = this.height;

    this.memeService.getAllMemeTemplates().subscribe(memeTemplates => {
      const memeTemplateContainer = document.getElementById('memeTemplatesContainer');
      memeTemplateContainer.innerHTML = '';
      this.memeTemplates = memeTemplates;

      this.showMemeTemplates();
    });
  }
  public ngAfterViewInit(): void {
    const canvasBackgroundEl: HTMLCanvasElement = this.backgroundCanvas.nativeElement;
    canvasBackgroundEl.width = this.currentWidth;
    canvasBackgroundEl.height = this.currentHeight;
    const ctx = canvasBackgroundEl.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, canvasBackgroundEl.width, canvasBackgroundEl.height);

    const canvasFileEl: HTMLCanvasElement = this.fileCanvas.nativeElement;
    canvasFileEl.width = this.currentWidth;
    canvasFileEl.height = this.currentHeight;

    const canvasTextEl: HTMLCanvasElement = this.textCanvas.nativeElement;
    canvasTextEl.width = this.currentWidth;
    canvasTextEl.height = this.currentHeight;

    const canvasTextboxEl: HTMLCanvasElement = this.textboxCanvas.nativeElement;
    canvasTextboxEl.width = this.currentWidth;
    canvasTextboxEl.height = this.currentHeight;

    const canvasDrawEl: HTMLCanvasElement = this.drawCanvas.nativeElement;
    const canvasDrawCtx = canvasDrawEl.getContext('2d');
    canvasDrawEl.width = this.currentWidth;
    canvasDrawEl.height = this.currentHeight;
    canvasDrawCtx.lineWidth = 3;
    canvasDrawCtx.lineCap = 'round';
    canvasDrawCtx.strokeStyle = this.colorPen;
    this.captureEvents(canvasDrawEl);
  }

  selectFile(event: any): void {
    this.videoOn = false;
    this.emptyVideoContainer();
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
    const canvas = this.fileCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    const reader = new FileReader();
    // Read in image
    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      console.log(event1);
      const img = new Image();
      img.src = event1.target.result as string;
      img.onload = () => {
        // Image to canvas
        ctx.drawImage(img, 0, 100, 600, 500);
      };
    };
  }

  selectVideo(event: any): void {
    // A video is uploaded from the users desktop
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      // if no video
      return;
    }
    const mimeType = event.target.files[0].type;
    if (mimeType.match(/video\/*/) == null) {
      // Check if video
      return;
    }
    const reader = new FileReader();
    // Read in video
    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      // hide html elements when video is playing
      this.videoOn = true;
      // base64 video string
      const videoString = event1.target.result as string;
      const videoContainer = document.getElementById('videoContainer');
      // empty videoContainer if another video showing
      this.emptyVideoContainer();
      // create video element
      const videoEl: HTMLVideoElement = document.createElement('video');
      videoEl.loop = true;
      videoEl.controls = true;
      videoContainer.appendChild(videoEl);
      // create source element
      const source = document.createElement('source');
      source.setAttribute('src', videoString);
      videoEl.appendChild(source);
      const containerWidth = this.width;
      const containerHeight = this.height;
      videoEl.addEventListener( 'loadedmetadata', function(e): void {
        // wait till loadedmetadata to have video element's videoWidth and videoHeight
        // calculate scaleFactor to properly show in meme container
        const scaleFactor = Math.min(containerWidth / this.videoWidth, containerHeight / this.videoHeight);
        videoEl.width = this.videoWidth * scaleFactor;
        videoEl.height = this.videoHeight * scaleFactor;
        // play video after scaling
        this.play().then(r => {} );
      }, false );
    };
  }

  emptyVideoContainer(): void {
    // empty the videoContainer
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.innerHTML = '';
  }

  textChanged(): void {
    const canvas = this.textCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);
    ctx.fillStyle = this.colorText;
    ctx.font = this.getFontStyle();
    ctx.textAlign = 'center';

    ctx.fillText(this.textTop.value, this.currentWidth / 2, 50);
    // this is to underline the text since there seem to be no text-decorations in canvas
    if (this.underline.value) {
      const {width} = ctx.measureText(this.textTop.value);
      ctx.fillRect((this.currentWidth / 2 - width / 2), 50, width, this.fontSize.value / 10);
    }

    ctx.fillText(this.textBottom.value, this.currentWidth / 2, this.currentHeight - 50);
    // this is to underline the text since there seem to be no text-decorations in canvas
    if (this.underline.value) {
      const {width} = ctx.measureText(this.textBottom.value);
      ctx.fillRect((this.currentWidth / 2 - width / 2), this.currentHeight - 50, width, this.fontSize.value / 10);
    }

    this.textboxes.forEach((textbox) => {
      const textMetrics = ctx.measureText(textbox.formControl.value);
      const width = textMetrics.width;
      const baseline = textMetrics.actualBoundingBoxAscent;

      ctx.fillText(textbox.formControl.value, textbox.xPos, textbox.yPos + baseline / 2);
      // this is to underline the text since there seem to be no text-decorations in canvas
      if (this.underline.value) {
        ctx.fillRect((textbox.xPos - width / 2), (textbox.yPos + baseline / 2),
          width, this.fontSize.value / 10);
      }
    });

    this.drawNewTextbox();
  }

  drawNewTextbox(): void {
    if (!this.newTextbox) {
      return;
    }

    const ctx = this.textboxCanvas.nativeElement.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);
    ctx.fillStyle = this.colorText;
    ctx.font = this.getFontStyle();
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(this.newTextbox.formControl.value);
    const width = textMetrics.width;
    const baseline = textMetrics.actualBoundingBoxAscent;

    ctx.fillText(this.newTextbox.formControl.value, this.newTextbox.xPos,
      this.newTextbox.yPos + baseline / 2);
    // this is to underline the text since there seem to be no text-decorations in canvas
    if (this.underline.value) {
      ctx.fillRect((this.newTextbox.xPos - width / 2), (this.newTextbox.yPos + baseline / 2),
        width, this.fontSize.value / 10);
    }
  }

  createNewTextbox(): void {
    this.drawingMode = false;

    const canvas = this.textboxCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);
    ctx.fillStyle = this.colorText;
    ctx.font = this.getFontStyle();
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(this.yourText.value);
    const width = textMetrics.width;
    const baseline = textMetrics.actualBoundingBoxAscent;

    this.newTextbox = new Textbox(this.yourText.value, null, null);
  }

  textboxChanged(): void {
    this.textChanged();
  }

  deleteTextbox(textbox: Textbox): void {
    this.newTextbox = null;

    const textboxCanvasCtx = this.textboxCanvas.nativeElement.getContext('2d');
    textboxCanvasCtx.clearRect(0, 0, this.currentWidth, this.currentHeight);
  }

  saveTextbox(textbox: Textbox): void {
    this.textboxes.push(textbox);
    this.newTextbox = null;

    const textboxCanvasCtx = this.textboxCanvas.nativeElement.getContext('2d');
    textboxCanvasCtx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    this.textChanged();
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

    fontFamilyChanged(e: MatSelectChange): void {
      this.textChanged();
    }

    boldButtonClicked(e: MatButtonToggleChange): void {
      this.bold.setValue(!this.bold.value);
      this.textChanged();
    }

    italicButtonClicked(e: MatButtonToggleChange): void {
      this.italic.setValue(!this.italic.value);
      this.textChanged();
    }

    underlineButtonClicked(e: MatButtonToggleChange): void {
      this.underline.setValue(!this.underline.value);
      this.textChanged();
    }

  clearCanvas(): void {
    this.resizeCanvasHeight(this.height);

    this.colorBackground = '#FFFFFF';
    let canvas = this.backgroundCanvas.nativeElement;
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, this.currentWidth, this.currentHeight);

    canvas = this.fileCanvas.nativeElement;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    canvas = this.textCanvas.nativeElement;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    canvas = this.textboxCanvas.nativeElement;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    canvas = this.drawCanvas.nativeElement;
    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    this.textboxes = [];

    this.newTextbox = null;
  }

  downloadCanvas(): void {
    const image = this.createImageStringFromCanvas();
    const link = document.createElement('a');
    link.download = 'meme.png';
    link.href = image;
    link.click();
  }

  textColorChanged($event: ColorEvent): void {
    this.colorText = $event.color.hex;
    this.textChanged();
  }

  penColorChanged($event: ColorEvent): void {
    this.colorPen = $event.color.hex;
    const canvas = this.drawCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = this.colorPen;
  }

  backgroundColorChanged($event: ColorEvent): void {
    this.colorBackground = $event.color.hex;
    const canvas = this.backgroundCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = this.colorBackground;
    ctx.fillRect(0, 0, this.currentWidth, this.currentHeight);
  }

  private captureEvents(canvasEl: HTMLCanvasElement): void {
    fromEvent(canvasEl, 'mousemove').subscribe((res: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();

      const currentPos = {
        x: res.clientX - rect.left,
        y: res.clientY - rect.top
      };

      if (this.drawingMode) {
        this.drawOnCanvas(this.previousDrawPosition, currentPos);

        this.previousDrawPosition = currentPos;
      } else if (this.newTextbox && !this.newTextbox.fixedPosition) {
        this.newTextbox.xPos = currentPos.x;
        this.newTextbox.yPos = currentPos.y;
        this.drawNewTextbox();
      }
    });
    fromEvent(canvasEl, 'mousedown').subscribe((res: MouseEvent) => {
      const rect = canvasEl.getBoundingClientRect();

      const currentPos = {
        x: res.clientX - rect.left,
        y: res.clientY - rect.top
      };

      if (!this.newTextbox) {
        this.drawingMode = true;

        this.previousDrawPosition = currentPos;
      } else if (!this.newTextbox.fixedPosition) {
        this.newTextbox.fixedPosition = true;
        this.newTextbox.xPos = currentPos.x;
        this.newTextbox.yPos = currentPos.y;
        this.drawNewTextbox();
      }
    });
    fromEvent(canvasEl, 'mouseup').subscribe((res: MouseEvent) => {
      this.drawingMode = false;
      this.previousDrawPosition = null;
    });
  }

  private drawOnCanvas(prevPos: { x: number, y: number }, currentPos: { x: number, y: number }): void {
    const drawCanvasCtx = this.drawCanvas.nativeElement.getContext('2d');

    if (!drawCanvasCtx) {
      return;
    }

    drawCanvasCtx.beginPath();

    if (prevPos) {
      drawCanvasCtx.moveTo(prevPos.x, prevPos.y); // from
      drawCanvasCtx.lineTo(currentPos.x, currentPos.y);
      drawCanvasCtx.stroke();
    }
  }

  createImageStringFromCanvas(): string {
    const canvas = document.createElement('canvas');
    canvas.width = this.currentWidth;
    canvas.height = this.currentHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.backgroundCanvas.nativeElement, 0, 0);
    ctx.drawImage(this.fileCanvas.nativeElement, 0, 0);
    ctx.drawImage(this.textCanvas.nativeElement, 0, 0);
    ctx.drawImage(this.drawCanvas.nativeElement, 0, 0);
    const image = canvas.toDataURL('image/png');

    return image;
  }

  reloadAndShowMemeTemplates(): void {
    this.memeTemplates = [];
    this.currentlyShownMemeTemplateIndex = -1;
    const memeTemplateContainer = document.getElementById('memeTemplatesContainer');
    memeTemplateContainer.innerHTML = 'Loading meme templates...';

    this.memeService.getAllMemeTemplates().subscribe(memeTemplates => {
      memeTemplateContainer.innerHTML = '';
      console.log(memeTemplates);
      this.memeTemplates = memeTemplates;

      this.showMemeTemplates();
    });
  }

  showMemeTemplates(): void {
    const memeTemplateContainer = document.getElementById('memeTemplatesContainer');
    this.memeTemplates.forEach(template => {
      const newImg = document.createElement('img');
      newImg.className = 'memeTemplate';
      newImg.width = 80;
      newImg.height = 80;
      newImg.addEventListener('click', () => {
        this.videoOn = false;
        this.emptyVideoContainer();
        this.currentlyShownMemeTemplateIndex = this.memeTemplates.indexOf(template);

        const canvas = this.fileCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

        const memeTemplate = new Image();
        memeTemplate.src = 'data:image/png;base64,' + template.base64_string;
        memeTemplate.onload = () => {
          const scaleFactor = memeTemplate.width / this.width;
          this.resizeCanvasHeight(memeTemplate.height / scaleFactor);
          ctx.drawImage(memeTemplate, 0, 0, memeTemplate.width, memeTemplate.height, 0, 0, this.width, this.currentHeight);

          this.textChanged();
        };
      });
      newImg.src = 'data:image/jpg;base64,' + template.base64_string;
      newImg.alt = 'Loading';
      memeTemplateContainer.append(newImg);
    });
  }

  loadFromWebcam(): void {
    console.log('opening webcam');
    this.videoOn = false;
    this.emptyVideoContainer();
    if (this.cameraOn === false){
      this.cameraOn = true;
    }
  }

  /**
   * load image from a given url
   */
  loadFromURL(): void {
    this.clearCanvas();
    console.log('pressed url');
    const ctx = this.fileCanvas.nativeElement.getContext('2d');
    const img = new Image();
    img.src = this.url;
    img.onload = () => ctx.drawImage(img, 0, 100, 600, 500);

  }


  loadScreenshotOfURL(): void {
    console.log('pressed screenshot');

  }

  /**
   * loads Images from the backend;
   * @see getMemesFromImgFlip
   */
  loadFromAPI(): void {
    this.clearCanvas();
    console.log('pressed api');
    this.videoOn = false;
    this.emptyVideoContainer();
    this.memeService.getMemesFromImgFlip().subscribe(data => {
      console.log(data);
      this.imagesRecieved = JSON.parse(JSON.stringify(data));
    }, null, () => {
      this.imagesRecieved = this.imagesRecieved.data.memes;
      this.randomImageIndex = Math.floor(Math.random() * this.imagesRecieved.length);
      const randomImage = this.imagesRecieved[this.randomImageIndex];
      const ctx = this.fileCanvas.nativeElement.getContext('2d');
      const img = new Image();
      img.src = randomImage.url;
      img.onload = () => {
        const scaleFactor = randomImage.width / this.width;
        this.resizeCanvasHeight(randomImage.height / scaleFactor);
        this.getCanvasRowspan();

        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, this.width, this.currentHeight);
      };
    });
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }
  public handleImage(webcamImage: WebcamImage): void {
    console.log('received webcam image', webcamImage);
    this.webcamImage = webcamImage;
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }
  public handleInitError(error: WebcamInitError): void {
    if (error.mediaStreamError && error.mediaStreamError.name === 'NotAllowedError') {
      console.warn('Camera access was not allowed by user!');
    }
  }


  showOnCanvas(): void {
    const ctx = this.fileCanvas.nativeElement.getContext('2d');
    const img = new Image();
    if (this.webcamImage) {
      img.src = this.webcamImage.imageAsDataUrl;
      ctx.drawImage(img, 0, 100, 600, 500);
    }
    this.cameraOn = false;
  }

  saveCanvas(): void {
    const image = this.createImageStringFromCanvas();
    const meme = new Meme();
    meme.imageString = image;
    meme.private = false;
    meme.title = this.name.value;
    this.memeService.saveMeme(meme);

  }

  saveCanvasAsDraft(): void {

  }

  saveCanvasPrivate(): void {
    const image = this.createImageStringFromCanvas();
    const meme = new Meme();
    meme.imageString = image;
    meme.private = true;
    meme.title = this.name.value;
    this.memeService.saveMeme(meme);

  }

  getSafeUrl(base64String: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' + base64String);
  }

  resizeCanvasHeight(height: number): void {
    this.currentHeight = height;

    const canvasBackgroundEl: HTMLCanvasElement = this.backgroundCanvas.nativeElement;
    canvasBackgroundEl.width = this.currentWidth;
    canvasBackgroundEl.height = this.currentHeight;

    const canvasFileEl: HTMLCanvasElement = this.fileCanvas.nativeElement;
    canvasFileEl.width = this.currentWidth;
    canvasFileEl.height = this.currentHeight;

    const canvasTextEl: HTMLCanvasElement = this.textCanvas.nativeElement;
    canvasTextEl.width = this.currentWidth;
    canvasTextEl.height = this.currentHeight;

    const canvasTextboxEl: HTMLCanvasElement = this.textboxCanvas.nativeElement;
    canvasTextboxEl.width = this.currentWidth;
    canvasTextboxEl.height = this.currentHeight;

    const canvasDrawEl: HTMLCanvasElement = this.drawCanvas.nativeElement;
    canvasDrawEl.width = this.currentWidth;
    canvasDrawEl.height = this.currentHeight;
  }

  getCanvasRowspan(): number {
    // adding 0.2 for the title and menu
    return Math.ceil(this.currentHeight / this.rowHeight + 0.2);
  }

  memeTemplateChosen(template: { name: string, base64_string: string }): void {
    const canvas = this.fileCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    const memeTemplate = new Image();
    memeTemplate.src = 'data:image/png;base64,' + template.base64_string;
    memeTemplate.onload = () => {
      const scaleFactor = memeTemplate.width / this.width;
      this.resizeCanvasHeight(memeTemplate.height / scaleFactor);
      ctx.drawImage(memeTemplate, 0, 0, memeTemplate.width, memeTemplate.height, 0, 0, this.width, this.currentHeight);

      this.textChanged();
    };
  }

  previousTemplateButtonClicked(): void {
    if (this.currentlyShownMemeTemplateIndex === -1 || this.currentlyShownMemeTemplateIndex === 0) {
      this.currentlyShownMemeTemplateIndex = this.memeTemplates.length - 1;
    } else {
      this.currentlyShownMemeTemplateIndex--;
    }

    this.memeTemplateChosen(this.memeTemplates[this.currentlyShownMemeTemplateIndex]);
  }

  nextTemplateButtonClicked(): void {
    const amountOfMemeTemplates = this.memeTemplates.length;
    if (this.currentlyShownMemeTemplateIndex === -1 || this.currentlyShownMemeTemplateIndex === amountOfMemeTemplates - 1) {
      this.currentlyShownMemeTemplateIndex = 0;
    } else {
      this.currentlyShownMemeTemplateIndex++;
    }

    this.memeTemplateChosen(this.memeTemplates[this.currentlyShownMemeTemplateIndex]);
  }

  /**
   * Opens the URL input dialog
   * @see InputUrlDialogComponent
   */
  openDialog(): void {
    this.videoOn = false;
    let toggle = '';
    this.emptyVideoContainer();

    const dialogRef = this.dialog.open(InputUrlDialogComponent, {
      width: '600px',
      data: {name: this.url}
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      toggle = result.split(' ')[0];
      this.url = result.split(' ')[1];
    }, null , () => {
      // Switch toggle between image from url and screenshot from url
      if (toggle === 'url') {
        this.loadFromURL();
      } else {
        this.videoOn = false;
        this.emptyVideoContainer();
        this.clearCanvas();
        const ctx = this.fileCanvas.nativeElement.getContext('2d');
        const img = new Image();
        // Send request with endoded URL as paramter to backend
        this.memeService.getScreenshotFromUrl(encodeURIComponent(this.url)).subscribe(response => {
          this.res = response;
          // add missing data info to base64 response string
          img.src = 'data:image/png;base64, ' + this.res;
          console.log(img.src);
          this.width = img.width;
          img.onload = () => ctx.drawImage(img, 0, 100, img.width, img.height);
        });
      }
    });
  }
}
