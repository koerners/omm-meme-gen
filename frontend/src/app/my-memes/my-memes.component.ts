import {Component, OnInit} from '@angular/core';
import {FormControl} from '@angular/forms';
import {BreakpointObserver} from '@angular/cdk/layout';
import {MemeService} from '../services/meme.service';
import {Meme} from '../Meme';
import {PageEvent} from '@angular/material/paginator';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {MatRadioChange} from '@angular/material/radio';

interface TextType {
  text: string;
  type: string;
}

@Component({
  selector: 'app-my-memes',
  templateUrl: './my-memes.component.html',
  styleUrls: ['./my-memes.component.css']
})
export class MyMemesComponent implements OnInit {
  allMemes: Meme[];
  pageEvent: PageEvent;
  memeLength: number;
  currentTab: number;
  currentPage: number;
  nextUrl: string;
  prevUrl: string;

  // using | keyvalue: asIsOrder for iteration keeps the order
  filterOptions: Map<string, TextType> = new Map([
    ['title', {text: 'Title', type: 'text'}],
    ['owner_id', {text: 'Username', type: 'user'}],
    ['-views', {text: 'View Count lte', type: 'number'}],
    ['views', {text: 'View Count gte', type: 'number'}],
    ['-created', {text: 'Memes created before', type: 'date'}],
    ['created', {text: 'Memes created after', type: 'date'}],
  ]);
  selectedFilter: string;
  filterType: string;
  filterValue: string;

  sortOptions: Map<string, string> = new Map([
    ['title', 'Title'],
    ['owner', 'Username'],
    ['views', 'View Count'],
    ['created', 'Timestamp'],
  ]);
  selectedSort: string;
  selectedOrder: string;

  constructor(private memeService: MemeService) {
  }

  ngOnInit(): void {
    this.currentTab = 0;
    this.currentPage = 0;
    this.selectedSort = 'created';
    this.selectedOrder = '-';
    this.selectedFilter = '';
    this.filterType = '';
    this.filterValue = '';
    this.loadMemes();
  }

  // getData based on nextUrl/previousUrl
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

  // load Memes by Tab, Sort, Filter
  loadMemes(): any {
    // Tab MyMemes
    if (this.currentTab === 1){
      this.memeService.getOwn().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);
          return this.allMemes;
        }
      );
    }
    // Tab Others Memes
    else {
      this.memeService.getAllSortFilter(this.selectedSort, this.selectedOrder, this.selectedFilter, this.filterValue).subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);
          return this.allMemes;
        }
      );
    }
  }

  onTabChanged($event: MatTabChangeEvent): void {
    this.currentTab = $event.index;
    this.currentPage = 0;
    this.loadMemes();
  }

  submitChanged(): void {
    this.currentPage = 0;
    this.loadMemes();
  }

  onFilterChanged(): void {
    if (this.selectedFilter) {
      if (this.filterType !== this.filterOptions.get(this.selectedFilter).type) {
        this.filterValue = '';
        this.filterType = this.filterOptions.get(this.selectedFilter).type;
      }
      else {
        // Type stays the same (means only change in direction)
        this.submitChanged();
      }
    }
    else {
      // Filter reset to None
      this.filterValue = '';
      this.filterType = '';
      this.submitChanged();
    }
  }

  // Dummy sort function to avoid maps get sorted alphabetic when using | keyvalue: asIsOrder
  asIsOrder(a, b): number {
    return 0;
  }
}
