import {
  AfterContentChecked, AfterViewChecked,
  Component,
  ElementRef,
  Input, OnChanges,
  OnInit,
  ViewChild
} from '@angular/core';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import '@tensorflow/tfjs-backend-webgl';
import {ObjectRecognitionService, Prediction} from '../services/object-recognition-service';
import {MatChipsModule} from '@angular/material/chips';
import {delay} from 'rxjs/operators';
import {Observable} from 'rxjs';


@Component({
  selector: 'app-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.css']
})
export class DetailViewComponent implements OnInit {
  public meme: Meme;
  selectedId: number;
  comments: any;
  public predictions: Prediction[];

  // tslint:disable-next-line:max-line-length
  constructor(private memeService: MemeService, private route: ActivatedRoute, private snackBar: MatSnackBar, private predictionService: ObjectRecognitionService, private router: Router) {
    this.meme = new Meme();

  }

  ngOnInit(): void {

    this.route.params.subscribe(params => {
      const memeId = Number(this.route.snapshot.paramMap.get('id'));
      this.loadMeme(memeId);
    });
  }

  loadMeme(memeId: number): void {
    this.memeService.loadMeme(String(memeId)).subscribe(data => {
      console.log(data);
      this.meme = new Meme();
      this.meme.id = data.id;
      this.meme.imageString = data.image_string;
      this.meme.title = data.title;
      this.meme.upvotes = data.upvotes;
      this.meme.downvotes = data.downvotes;
      this.meme.owner = data.owner;
      this.getImageContent(data.image_string);
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

  getImageContent(base64String): void {
    this.predictionService.predictObject(base64String).then(r => {
        this.predictions = r;
      }
    );
  }


  nextImage(): void {
    console.log(this.meme);
    this.router.navigate(['/meme/' + String(Number(this.meme.id) + 1)]);
  }

  prevImage(): void {
    this.router.navigate(['/meme/' + String(Number(this.meme.id) - 1)]);

  }
}
