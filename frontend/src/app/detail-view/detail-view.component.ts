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
import {Comment} from '../Comment';
import {FormControl} from '@angular/forms';
import {map} from 'rxjs/operators';
import {interval, Subscription} from 'rxjs';
import {ChartDataSets} from 'chart.js';
import {SpeechService} from '../services/speech.service';
import {VoiceRecognitionService} from '../services/voice-recognition.service';


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
  slideshowspeed = 4;
  slideshowRandom: boolean;
  private subscription: Subscription;
  rowHeight = 330;
  chartRowHeight = this.rowHeight - 80;
  viewsAndVotes;
  viewedChartReady: any;
  viewedRowHeight: any;
  viewedChartData: ChartDataSets[];
  viewedChartLabels: any;
  viewedChartOptions: any;
  viewedChartColors: any;
  viewedChartLegend: {fullWidth: false};
  viewedChartType = 'pie';
  viewedChartPlugins: any;
  // Vote Chart  below, views chart above
  vChartReady: any;
  vRowHeight: any;
  vChartData: ChartDataSets[];
  vChartLabels: any;
  vChartOptions: any;
  vChartColors: any;
  vChartLegend: any;
  vChartType = 'pie';
  vChartPlugins: any;
  statsOn: false;

  constructor(private memeService: MemeService,
              private route: ActivatedRoute,
              private snackBar: MatSnackBar,
              private predictionService: ObjectRecognitionService,
              private router: Router,
              private speechService: SpeechService,
              public vRS: VoiceRecognitionService) {
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
      this.meme = new Meme();
      this.meme.id = data.id;
      this.meme.imageString = data.image_string;
      this.meme.title = data.title;
      this.meme.upvotes = data.upvotes;
      this.meme.downvotes = data.downvotes;
      this.meme.owner = data.owner;
      this.meme.views = data.views;
      this.meme.type = data.type;
      this.getImageContent(data.image_string);
      this.loadComments();
      this.loadVotes();
      this.loadStats();
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
    this.memeService.postComment(String(this.meme.id), this.commentText.value).subscribe(data => {
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
    // TODO jump to beginning at end
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

  shareLink(val: string): void {
      const selBox = document.createElement('textarea');
      selBox.style.position = 'fixed';
      selBox.style.left = '0';
      selBox.style.top = '0';
      selBox.style.opacity = '0';
      selBox.value = val;
      document.body.appendChild(selBox);
      selBox.focus();
      selBox.select();
      document.execCommand('copy');
      document.body.removeChild(selBox);
    }

  slideshow(): void {
    if (this.slideShowRunning) {
      this.slideShowRunning = false;
      this.subscription.unsubscribe();
    } else {
      this.slideShowRunning = true;
      const source = interval(this.slideshowspeed * 1000);
      this.subscription = source.subscribe(val => {
        if (this.slideshowRandom) {
          this.meme.id = this.availableMemes[Math.floor(Math.random() * this.availableMemes.length)].id;
        }
        this.nextImage();
      });

    }
  }

  randomImage(): void {
    this.meme.id = this.availableMemes[Math.floor(Math.random() * this.availableMemes.length)].id;
    this.nextImage();
  }

  loadStats(): void{
    this.memeService.loadMemeStats(String(this.meme.id)).subscribe(response => {

        this.viewsAndVotes = {
          vote: response.votes, all_vote: response.votes_all, view: response.views, all_view: response.views_all};
        console.log(this.viewsAndVotes.view);
        this.drawViewedMemeChart();
        this.drawVotesMemeChart();
    });
  }

  drawViewedMemeChart(): void {
    const chartData = [this.viewsAndVotes.view.views, this.viewsAndVotes.all_view.views__sum - this.viewsAndVotes.view.views];
    this.viewedChartData = [
      { data: chartData, label: 'View Proportion', backgroundColor: [
        'red', 'green']},
    ];
    this.viewedChartOptions = {
      responsive: false,
       maintainAspectRatio: false,
      legend: {
        labels: {
          fontColor: 'white',
          fontSize: 18
        }
      },

    };
    console.log(this.viewedChartData);
    this.viewedChartLabels = ['views', 'total Views excluding this meme'];
    this.viewedChartColors = ['black', 'white'];

    this.viewedChartReady = true;
  }
  drawVotesMemeChart(): void {
    const chartData =  [this.viewsAndVotes.vote, this.viewsAndVotes.all_vote - this.viewsAndVotes.vote];
    this.vChartData = [
      { data: chartData, label: 'View Proportion', backgroundColor: [
          'red', 'green'] },
    ];
    this.vChartOptions = {
      responsive: false,
      maintainAspectRatio: false,
      legend: {
        labels: {
          fontColor: 'white',
          fontSize: 18
        }
      },
    };
    console.log(this.vChartData);
    this.vChartLabels = ['votes', 'total votes excluding this meme'];
    this.vChartColors = ['black', 'white'];

    this.vChartReady = true;
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

    if (this.meme.title) {
      text += 'This meme\'s title is ' + this.meme.title + '.';
    } else {
      text += 'This meme has no title';
    }

    text += 'This meme has ' + this.meme.upvotes + ' upvotes';

    text += 'This meme has ' + this.meme.downvotes + ' downvotes';

    text += 'This meme has ' + this.meme.views + ' view';

    text += 'This meme was created by ' + this.meme.owner + '';

    text += 'This meme has ' + this.comments.length + ' comments';

    let commentCounter = 1;
    this.comments.forEach(comment => {
      text += 'Comment number ' + commentCounter + '';

      text += 'Comment ' + comment.text + 'made by ' + comment.owner + ' on the ' + comment.created.slice(0, 10) + '';

      commentCounter++;
    });

    return text;
  }

  // VoiceRecognition and its functions //
  private configureVoiceRecognition(): void {
  }

}
