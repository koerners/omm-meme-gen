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
import {User} from '../User';
import {Comment} from '../Comment';
import {FormControl} from '@angular/forms';
import {interval, Subscription} from 'rxjs';

@Component({
  selector: 'app-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.css']
})
export class DetailViewComponent implements OnInit {
  public meme: Meme;
  selectedId: number;
  comments: Comment[];
  commentText = new FormControl('');
  availableMemes: Meme[];
  slideShowRunning: boolean;
  public predictions: Prediction[];

  // tslint:disable-next-line:max-line-length
  slideshowspeed = 4;
  slideshowRandom: boolean;
  private subscription: Subscription;

  // tslint:disable-next-line:max-line-length
  constructor(private memeService: MemeService, private route: ActivatedRoute, private snackBar: MatSnackBar, private predictionService: ObjectRecognitionService, private router: Router) {
    this.meme = new Meme();
  }

  ngOnInit(): void {

    this.route.params.subscribe(params => {
      const memeId = Number(this.route.snapshot.paramMap.get('id'));
      this.loadMeme(memeId);

    });

    this.memeService.availableMemeIds().subscribe(data => {
      this.availableMemes = data.reverse();
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
      this.meme.views = data.views;
      this.meme.created = data.created;
      this.getImageContent(data.image_string);
      this.loadComments();
      this.loadVotes();
    });

  }


  loadComments(): void {

    this.comments = [];

    this.memeService.loadComments(String(this.meme.id)).subscribe(data => {
      data.forEach(value => {
        const comment = new Comment();
        comment.text = value.text;
        comment.created = value.created;
        comment.owner = value.owner;
        this.comments.push(comment);
      });

    });
  }

  loadVotes(): void {
    this.memeService.loadVotes(String(this.meme.id)).subscribe(data => {
      this.meme.upvotes = data.upvotes;
      this.meme.downvotes = data.downvotes;
      this.meme.liked = data.liked;
      this.meme.voted = data.voted;
    });
  }

  upvote(): void {

    this.memeService.vote(String(this.meme.id), true).subscribe(data => {
      this.openSnackBar('Meme upvoted', 'Dismiss');
      this.loadVotes();

    });

  }

  downvote(): void {
    this.memeService.vote(String(this.meme.id), false).subscribe(data => {
      this.openSnackBar('Meme downvoted', 'Dismiss');
      this.loadVotes();

    });


  }

  async postComment(): Promise<void> {
    console.log(this.commentText.value);
    this.memeService.postComment(String(this.meme.id), this.commentText.value).subscribe(data => {
      console.log(data);
      this.openSnackBar('Comment posted', 'Dismiss');
      this.loadComments();

    });


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


  getNextMemeId(next: boolean): Meme {

    for (let i = 0; i < this.availableMemes.length; i++) {
      if (this.availableMemes[i].id === this.meme.id) {
        if (next) {
          if ((i + 1) < this.availableMemes.length) {
            return this.availableMemes[i + 1];
          } else {

            return this.availableMemes[0];
          }
        } else {
          if ((i - 1) >= 0) {
            return this.availableMemes[i - 1];
          } else {
            return this.availableMemes[this.availableMemes.length - 1];
          }
        }

      }
    }
    return this.availableMemes[0];

  }


  nextImage(): void {

    this.router.navigate(['/meme/' + String(this.getNextMemeId(true).id)]);
  }

  prevImage(): void {
    this.router.navigate(['/meme/' + String(this.getNextMemeId(false).id)]);

  }

  downloadCanvas(): void {
    const link = document.createElement('a');
    link.href = this.meme.imageString;
    link.download = this.meme.title + '.jpg';
    document.body.appendChild(link);
    link.click();
  }

  slideshow(): void {
    if (this.slideShowRunning) {
      this.slideShowRunning = false;
      this.subscription.unsubscribe();
    } else {
      this.slideShowRunning = true;
      console.log(this.slideshowspeed, this.slideshowRandom);
      const source = interval(this.slideshowspeed * 1000);
      this.subscription = source.subscribe(val => {
        if (this.slideshowRandom) {
          this.meme.id = this.availableMemes[Math.floor(Math.random() * this.availableMemes.length)].id;
        }
        this.nextImage();
      });

    }
  }
}
