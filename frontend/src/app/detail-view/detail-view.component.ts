import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {ActivatedRoute} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.css']
})
export class DetailViewComponent implements OnInit {
  public meme = new Meme();
  selectedId: number;
  comments: any;

  constructor(private memeService: MemeService, private route: ActivatedRoute, private snackBar: MatSnackBar) {
  }


  ngOnInit(): void {
    const heroId = String(this.route.snapshot.paramMap.get('id'));
    console.log('id', heroId);
    this.memeService.loadMeme(heroId).subscribe(data => {
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
}
