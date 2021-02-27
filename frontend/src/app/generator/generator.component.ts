import {AfterViewInit, Component, Input, ViewChild, ElementRef, NgZone} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {Router} from '@angular/router';
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
import {environment} from '../../environments/environment';
import {SpeechService} from '../services/speech.service';
import {VoiceRecognitionService} from '../services/voice-recognition.service';

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

  memeTemplates: {
    id: number;
    name, base64_string}[] = [];
  /**
   * The Color options available
   */
  colorOptions: string[] = ['black', '#808080', '#C0C0C0', 'white', '#800000', 'red', '#808000',
    'yellow', 'green', '#00FF00', '#008080', '#00FFFF', '#000080', 'blue', '#800080', '#FF00FF',
    '#795548', '#607d8b'];
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
  videoEl: HTMLVideoElement = null;
  sourceEl = null;
  res = '';

  currentWidth: number;
  currentHeight: number;
  currentlyShownMemeTemplateIndex = -1;
  currentVideoData = null;
  fromFrame = new FormControl('');
  toFrame = new FormControl('');
  addingText = false;
  maxFileSize = 5242880;

  @ViewChild('preview', {static: false}) previewCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('previewBackground', {static: false}) backgroundCanvas;
  @ViewChild('previewFile', {static: false}) fileCanvas;
  @ViewChild('previewText', {static: false}) textCanvas;
  @ViewChild('previewTextbox', {static: false}) textboxCanvas;
  @ViewChild('previewDraw', {static: false}) drawCanvas;
  @ViewChild('videoCanvas', {static: false}) videoCanvas;
  // @ViewChild('videoElement', {static: false}) videoElement: HTMLVideoElement;
  // @ViewChild('videoSource', {static: false}) videoSource;
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
  public webcamImage: WebcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  url: string;
  posts: any;
  private imagesRecieved: any;
  private randomImageIndex: number;
  processor = null;

  // Map for ScreenReader Output
  private screenReaderText: Map<string, string>;
  private isTemplate: boolean;
  private currentMeme: any;


  constructor(private memeService: MemeService, private sanitizer: DomSanitizer, public dialog: MatDialog,
              private ngZone: NgZone, private router: Router,
              private speechService: SpeechService, public vRS: VoiceRecognitionService) {
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

    // ScreenReader & VoiceRecognition
    this.screenReaderText = new Map<string, string>();
    this.screenReaderText.set('Welcome', 'This page is Meme Life Generate Meme.');
    this.configureVoiceRecognition();
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
    this.clearCanvas();
    // empty videoContainer if another video showing
    this.emptyVideoContainer();
    // hide html elements when video is playing
    this.videoOn = true;

    const self = this;

    // A video is uploaded from the users desktop
    if (!event.target.files[0] || event.target.files[0].length === 0) {
      // if no video
      this.emptyVideoContainer();
      return;
    }

    console.log('target', event.target);
    console.log('files', event.target.files[0]);
    console.log('size', event.target.files[0].size);

    const mimeType = event.target.files[0].type;
    if (mimeType.match(/video\/*/) == null) {
      // Check if video
      this.emptyVideoContainer();
      return;
    }

    if (event.target.files[0].size > this.maxFileSize) {
      alert('File to big, maximum of ' + this.maxFileSize + ' bytes.');
      this.emptyVideoContainer();
      return;
    }

    const reader = new FileReader();
    // Read in video
    reader.readAsDataURL(event.target.files[0]);
    reader.onload = event1 => {
      // extract images from video
      const videoString = event1.target.result as string;

      this.memeService.convertVideoToImages(videoString).subscribe(data => {
        console.log(data);
        this.currentVideoData = data;
        this.fromFrame.setValue(0);
        this.toFrame.setValue(data.frames - 1);

        // base64 video string
        const videoContainer = document.getElementById('videoContainer');
        // create video element
        this.videoEl = document.createElement('video');
        this.videoEl.id = 'videoElement';
        this.videoEl.loop = true;
        this.videoEl.controls = true;
        videoContainer.appendChild(this.videoEl);
        // create source element
        this.sourceEl = document.createElement('source');
        this.sourceEl.setAttribute('src', environment.apiUrl + '/' + data.video_url);
        this.videoEl.appendChild(this.sourceEl);
        const containerWidth = this.width;
        const containerHeight = this.height;
        this.videoEl.addEventListener('loadedmetadata', function(e): void {
          // wait till loadedmetadata to have video element's videoWidth and videoHeight
          // calculate scaleFactor to properly show in meme container
          self.currentVideoData.videoScaleFactor = Math.min(containerWidth / this.videoWidth, containerHeight / this.videoHeight);
          console.log(containerWidth, this.videoWidth, containerHeight, this.videoHeight, self.currentVideoData.videoScaleFactor);
          // self.resizeCanvasHeight(videoEl.height * scaleFactor);
          self.videoEl.width = this.videoWidth * self.currentVideoData.videoScaleFactor;
          self.videoEl.height = this.videoHeight * self.currentVideoData.videoScaleFactor;
          self.resizeCanvasHeight(this.videoHeight * self.currentVideoData.videoScaleFactor,
            this.videoWidth * self.currentVideoData.videoScaleFactor);
          // play video after scaling
          this.play().then(r => {
          });
        });
      }, false);
    };
  }

  emptyVideoContainer(): void {
    // empty the videoContainer
    this.videoOn = false;
    this.currentVideoData = null;
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
    this.addingText = true;

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
    this.addingText = false;

    const textboxCanvasCtx = this.textboxCanvas.nativeElement.getContext('2d');
    textboxCanvasCtx.clearRect(0, 0, this.currentWidth, this.currentHeight);
  }

  saveTextbox(textbox: Textbox): void {
    this.addingText = false;

    const ctx = this.textboxCanvas.nativeElement.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);
    ctx.fillStyle = this.colorText;
    ctx.font = this.getFontStyle();
    ctx.textAlign = 'center';

    const textMetrics = ctx.measureText(this.newTextbox.formControl.value);
    const textWidth = textMetrics.width;
    const widthInPercent = textWidth / this.currentWidth;

    this.newTextbox = null;

    if (this.videoOn) {
      const textData = {
        video_url: this.currentVideoData.video_url,
        text: textbox.formControl.value,
        x_center_in_percent: textbox.xPos / this.currentWidth,
        y_center_in_percent: textbox.yPos / this.currentHeight,
        width_in_percent: widthInPercent,
        font_size: this.fontSize.value,
        text_color: this.colorText,
        from_frame: this.fromFrame.value,
        to_frame: this.toFrame.value,
        underline: this.underline.value,
        bold: this.bold.value,
        italic: this.italic.value
      };

      console.log(textData);

      this.currentVideoData = null;

      this.memeService.addTextToVideo(textData).subscribe(data => {
        this.currentVideoData = data;
        this.videoEl.pause();
        this.sourceEl.setAttribute('src', environment.apiUrl + '/' + data.video_url);
        this.videoEl.load();
        this.videoEl.play();
      });
    } else {
      this.textboxes.push(textbox);

      const textboxCanvasCtx = this.textboxCanvas.nativeElement.getContext('2d');
      textboxCanvasCtx.clearRect(0, 0, this.currentWidth, this.currentHeight);

      this.textChanged();
    }
  }

  getFontStyle(): string {
    let fontStyle = '';
    fontStyle += this.bold.value ? 'bold ' : '';
    fontStyle += this.italic.value ? 'italic ' : '';
    fontStyle += parseInt(this.fontSize.value, 10) + 'px ';
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
    this.addingText = false;
    this.resizeCanvasHeight(this.height, this.width);

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

      if (this.drawingMode && !this.videoOn) {
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
        this.currentMeme = template[0];

        this.isTemplate = true;
        this.memeService.postTemplateStat(template[0]);
        this.videoOn = false;
        this.emptyVideoContainer();
        this.currentlyShownMemeTemplateIndex = (template[0] - 1);
        const canvas = this.fileCanvas.nativeElement;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

        const memeTemplate = new Image();
        memeTemplate.src = 'data:image/png;base64,' + template[2];
        memeTemplate.onload = () => {
          const scaleFactor = memeTemplate.width / this.width;
          this.resizeCanvasHeight(memeTemplate.height / scaleFactor, memeTemplate.width / scaleFactor);
          ctx.drawImage(memeTemplate, 0, 0, memeTemplate.width, memeTemplate.height, 0, 0, this.width, this.currentHeight);

          this.textChanged();
        };
      });
      newImg.src = 'data:image/jpg;base64,' + template[2];
      newImg.alt = 'Loading';
      memeTemplateContainer.append(newImg);
    });
  }

  loadFromWebcam(): void {
    console.log('opening webcam');
    this.emptyVideoContainer();
    if (this.cameraOn === false) {
      this.cameraOn = true;
    }
  }

  /**
   * load image from a given url
   */
  loadFromURL(): void {
    this.memeService.getImageFrom(encodeURIComponent(this.url)).subscribe(res => {
      console.log(res);
      const ctx = this.fileCanvas.nativeElement.getContext('2d');
      const img = new Image();
      img.src =  'data:image/jpg;base64,' + res.img;
      img.onload = () => ctx.drawImage(img, 0, 100, 600, 500);
    });
  }

  loadScreenshotOfURL(): void {
    console.log('pressed screenshot');
    this.emptyVideoContainer();
  }

  /**
   * loads Images from the backend;
   * @see getMemesFromImgFlip
   */
  loadFromAPI(): void {
    this.clearCanvas();
    console.log('pressed api');
    this.emptyVideoContainer();
    this.memeService.getMemesFromImgFlip().subscribe(data => {
      const imgSrc = 'data:image/png;base64,' + data.img;
      const ctx = this.fileCanvas.nativeElement.getContext('2d');
      const img = new Image();
      img.src = imgSrc;
      img.onload = () => {
        const scaleFactor = data.width / this.width;
        this.resizeCanvasHeight(data.height / scaleFactor, data.width / scaleFactor);
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

  saveCanvas(privateMeme = false): void {
    const meme = new Meme();
    if (this.videoOn) {
      meme.imageString = environment.apiUrl + '/' + this.currentVideoData.video_url;
      meme.type = 1;
    } else {
      const image = this.createImageStringFromCanvas();
      meme.imageString = image;
      meme.type = 0;
    }
    meme.private = privateMeme;
    meme.title = this.name.value;
    meme.textConcated = this.textTop.value + ' ' + this.textBottom.value;
    if (this.textboxes) {
      this.textboxes.forEach(element => {
        meme.textConcated += ' ' + element.formControl.value;
      });
    }

    this.memeService.saveMeme(meme).subscribe(data => {
      if (this.isTemplate){
        this.memeService.setMemeServiceCurrentMeme(data.id);
        this.memeService.postTemplateStat(this.currentMeme);
        console.log(this.memeService.currentMemeId);
      }
    });
  }

  saveCanvasAsDraft(): void {

  }

  saveCanvasPrivate(): void {
    this.saveCanvas(true);
  }

  getSafeUrl(base64String: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,' + base64String);
  }

  resizeCanvasHeight(height: number, width: number): void {
    this.currentHeight = height;
    this.currentWidth = width;

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
    // this.emptyVideoContainer();
    const canvas = this.fileCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, this.currentWidth, this.currentHeight);

    const memeTemplate = new Image();
    memeTemplate.src = 'data:image/png;base64,' + template.base64_string;
    memeTemplate.onload = () => {
      const scaleFactor = memeTemplate.width / this.width;
      this.resizeCanvasHeight(memeTemplate.height / scaleFactor, memeTemplate.width / scaleFactor);
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
    const meme = this.memeTemplates[this.currentlyShownMemeTemplateIndex];
    this.currentMeme = meme.id;
    this.isTemplate = true;
    this.memeService.postTemplateStat(meme.id);
    this.isTemplate = true;
    this.memeTemplateChosen(meme);
  }

  nextTemplateButtonClicked(): void {
    const amountOfMemeTemplates = this.memeTemplates.length;
    if (this.currentlyShownMemeTemplateIndex === -1 || this.currentlyShownMemeTemplateIndex === amountOfMemeTemplates - 1) {
      this.currentlyShownMemeTemplateIndex = 0;
    } else {
      this.currentlyShownMemeTemplateIndex++;
    }
    const meme = this.memeTemplates[this.currentlyShownMemeTemplateIndex];
    this.memeService.postTemplateStat(meme.id);
    this.currentMeme = meme.id;
    this.isTemplate = true;
    this.memeTemplateChosen(meme);
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

  // ScreenReader and its functions //
  public screenReader(): void {
    this.speechService.speak(this.screenReaderBuilder());
  }

  public stopScreenReader(): void {
    this.speechService.stop();
  }

  private screenReaderBuilder(): string {
    let text = '';
    text += this.screenReaderText.get('Welcome') + ' ';
    if (this.textTop) {
      text += 'Text top is set to ' + this.textTop.value + ' ';
    }

    return text;
  }

  // VoiceRecognition and its functions //
  private configureVoiceRecognition(): void {
    const commands = {
      'open webcam': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Open Webcam');
        this.loadFromWebcam();
      },
      'load random image': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'load random image');
        this.loadFromAPI();
      },
      'close webcam': () => {
        if (this.cameraOn === true) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Close Webcam');
          this.showOnCanvas();
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Webcam is not open');
        }
      },
      'take picture': () => {
        if (this.cameraOn === true) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Take Picture');
          this.triggerSnapshot();
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Webcam is not open');
        }
      },
      'title *text': (text: string) => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set title to "' + text + '"');
        this.name.setValue(text);
        this.textChanged();
      },
      'text top *text': (text: string) => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Text Top to "' + text + '"');
        this.textTop.setValue(text);
        this.textChanged();
      },
      'text bottom *text': (text: string) => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Text Bottom to "' + text + '"');
        this.textBottom.setValue(text);
        this.textChanged();
      },
      'font size :fsize': (fsize: string) => {
        if (/^\d+$/.test(fsize)) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Size to "' + fsize + '"');
          this.fontSize.setValue(fsize);
          this.textChanged();
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Size to "' + fsize + '" not possible.');
        }
      },
      'font style arial': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to Arial');
        this.fontFamily.setValue('Arial');
        this.textChanged();
      },
      'font style verdana': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to Verdana');
        this.fontFamily.setValue('Verdana');
        this.textChanged();
      },
      'font style times new roman': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to Times New Roman');
        this.fontFamily.setValue('Times New Roman');
        this.textChanged();
      },
      'font style courier new': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to Courier New');
        this.fontFamily.setValue('Courier New');
        this.textChanged();
      },
      'font style serif': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to serif');
        this.fontFamily.setValue('serif');
        this.textChanged();
      },
      'font style sans-serif': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Font Style to sans-serif');
        this.fontFamily.setValue('sans-serif');
        this.textChanged();
      },
      'random font style': () => {
        const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'serif', 'sans-serif'];
        const item = fonts[Math.floor(Math.random() * fonts.length)];
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Choose random Font Style: ' + item);
        this.fontFamily.setValue(item);
        this.textChanged();
      },
      'alter bold': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Change Font bold');
        this.bold.setValue(!this.bold.value);
        this.textChanged();
      },
      'alter underline': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Change Font underline');
        this.underline.setValue(!this.underline.value);
        this.textChanged();
      },
      'alter italic': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Change Font italic');
        this.italic.setValue(!this.italic.value);
        this.textChanged();
      },
      'text colour :color': (color: string) => {
        const colorOptions = ['black', 'white', 'red', 'yellow', 'green', 'blue'];
        if (colorOptions.includes(color)) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Text Color = ' + color);
          this.colorText = color;
          this.textChanged();
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Text Color = ' + color + ' not possible');
        }
      },
      'pen colour :color': (color: string) => {
        const colorOptions = ['black', 'white', 'red', 'yellow', 'green', 'blue'];
        if (colorOptions.includes(color)) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Pen Color = ' + color);
          this.colorPen = color;
          const canvas = this.drawCanvas.nativeElement;
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = this.colorPen;
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Pen Color = ' + color + ' not possible');
        }
      },
      'background colour :color': (color: string) => {
        const colorOptions = ['black', 'white', 'red', 'yellow', 'green', 'blue'];
        if (colorOptions.includes(color)) {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Background Color = ' + color);
          this.colorBackground = color;
          const canvas = this.backgroundCanvas.nativeElement;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = this.colorBackground;
          ctx.fillRect(0, 0, this.currentWidth, this.currentHeight);
        }
        else {
          this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Set Background Color = ' + color + ' not possible');
        }
      },
      'save public': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Save Meme (public)');
        this.saveCanvas();
      },
      'save private': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Save Meme (private)');
        this.saveCanvasPrivate();
      },
      'save draft': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Save Draft');
        this.saveCanvasAsDraft();
      },
      'download meme': () => {
        this.ngZone.run(() => this.vRS.voiceActionFeedback = 'Download Meme');
        this.downloadCanvas();
      },
    };
    this.vRS.setUp(commands);
  }
}
