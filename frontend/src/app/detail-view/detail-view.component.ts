import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-detail-view',
  templateUrl: './detail-view.component.html',
  styleUrls: ['./detail-view.component.css']
})
export class DetailViewComponent implements OnInit {
  public meme = new Meme();
  selectedId: number;

  constructor(private memeService: MemeService, private route: ActivatedRoute) {
  }

  @ViewChild('preview', {static: false}) previewCanvas;
  @Input() public width = 600;
  @Input() public height = 700;

  ngOnInit(): void {

    const canvas = this.previewCanvas.nativeElement;

    const heroId = String(this.route.snapshot.paramMap.get('id'));
    console.log('id', heroId);
    this.memeService.loadMeme(heroId).subscribe(data => {
      console.log(data);
      this.meme.imageString = data.image_string;
      this.meme.title = data.title;
      this.meme.upvotes = data.upvotes;
      this.meme.downvotes = data.downvotes;


    });
  }
}
