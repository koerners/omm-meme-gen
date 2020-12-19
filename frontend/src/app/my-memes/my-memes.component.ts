import {Component, OnInit} from '@angular/core';
import {BreakpointObserver} from "@angular/cdk/layout";
import {MemeService} from "../services/meme.service";
import {Meme} from "../Meme";
import {PageEvent} from "@angular/material/paginator";
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'app-my-memes',
  templateUrl: './my-memes.component.html',
  styleUrls: ['./my-memes.component.css']
})
export class MyMemesComponent implements OnInit {
  allMemes: Meme[];
  pageEvent: PageEvent;
  memeLength: number;
  currentPage = 0;
  nextUrl: string;
  prevUrl: string;

  constructor(private memeService: MemeService) {

  }

  ngOnInit(): void {

  this.loadMemes(0);



  }

  getData($event: PageEvent): any {
    if ($event.pageIndex > this.currentPage) {
      this.memeService.paginator(this.nextUrl).subscribe(data => {
        this.allMemes = data.results;
        this.memeLength = data.count;
        this.nextUrl = data.next;
        this.prevUrl = data.previous;
        }
      );
      this.currentPage = $event.pageIndex;
    } else if ($event.pageIndex < this.currentPage) {
      this.memeService.paginator(this.prevUrl).subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
        }
      );
      this.currentPage = $event.pageIndex;
    }
    console.log(this.currentPage);

  }

  loadMemes(what: number): any {
    if (what === 0){
      this.memeService.getAll().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          console.log(this.nextUrl, this.prevUrl);
          return this.allMemes;
        }
      );
    }
    if (what === 1){
      this.memeService.getOwn().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          console.log(this.nextUrl, this.prevUrl);
          return this.allMemes;
        }
      );
    }
  }

  onTabChanged($event: MatTabChangeEvent): void {
    this.currentPage = 0;
    this.loadMemes($event.index);

  }
}
