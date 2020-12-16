import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import '@tensorflow/tfjs-backend-webgl';
import {ObjectRecognitionService, Prediction} from '../services/object-recognition-service';
import {MatChipsModule} from '@angular/material/chips';
import {delay} from 'rxjs/operators';


@Component({
  selector: 'app-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.css']
})
export class DetailViewComponent implements OnInit, AfterViewInit {
  public meme = new Meme();
  selectedId: number;
  comments: any;
  public predictions: Prediction[];
  @ViewChild('preview') public imageEl: ElementRef;

  // tslint:disable-next-line:max-line-length
  constructor(private memeService: MemeService, private route: ActivatedRoute, private snackBar: MatSnackBar, private predictionService: ObjectRecognitionService, private router: Router ) {

  }

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(async params => {
      this.meme.id = Number(this.route.snapshot.paramMap.get('id'));
      this.loadMeme();

    });

  }

   async loadMeme(): Promise<void> {
     await this.memeService.loadMeme(String(this.meme.id)).subscribe(data => {
       console.log(data);
       this.meme.imageString = data.image_string;
       this.meme.title = data.title;
       this.meme.upvotes = data.upvotes;
       this.meme.downvotes = data.downvotes;
       this.meme.owner = data.owner;
     });

   }

  upvote(): void {
    this.openSnackBar('Meme upvoted', 'Dismiss');
  }

  downvote(): void {
    this.openSnackBar('Meme downvoted', 'Dismiss');

  }

  postComment(): void {
    this.openSnackBar('Comment posted', 'Dismiss');

  }

  openSnackBar(message: string, action: string): void {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }

  getImageContent(): void {
    this.predictionService.predictObject(this.imageEl).then(r =>
      this.predictions = r
    );
  }

  ngAfterViewInit(): void {
  this.getImageContent();
  }

  nextImage(): void {
    this.router.navigate(['/meme/' + String(Number(this.meme.id) + 1 )]);
  }

  prevImage(): void {
    this.router.navigate(['/meme/' + String(Number(this.meme.id) - 1 )]);

  }
}
