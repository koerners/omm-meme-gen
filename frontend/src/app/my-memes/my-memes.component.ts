import {Component, NgZone, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {BreakpointObserver} from '@angular/cdk/layout';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {SpeechService} from '../services/speech.service';
import {VoiceRecognitionService} from '../services/voice-recognition.service';

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
  screenReaderText: Map<string, string>;

  // using | keyvalue: asIsOrder for iteration keeps the order
  filterOptions: Map<string, TextType> = new Map([
    ['search', {text: 'Text', type: 'text'}],
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

  constructor(private memeService: MemeService, private ngZone: NgZone, private router: Router,
              private speechService: SpeechService, public voiceRecognitionService: VoiceRecognitionService) {
    this.currentTab = 0;
    this.currentPage = 0;
    this.selectedSort = 'created';
    this.selectedOrder = '-';
    this.selectedFilter = '';
    this.filterType = '';
    this.filterValue = '';

    this.screenReaderText = new Map<string, string>();
    this.screenReaderText.set('Welcome', 'This page is Meme Life Gallery.');
    this.initVoiceRecognitionCommands();
  }

  ngOnInit(): void {
    this.loadMemes();
  }

  getData($event: PageEvent): any {
    this.readPaging($event.pageIndex + 1);
    if ($event.pageIndex > this.currentPage) {
      this.memeService.paginator(this.nextUrl).subscribe(data => {
        this.allMemes = data.results;
        this.memeLength = data.count;
        this.nextUrl = data.next;
        this.prevUrl = data.previous;
        this.readCurrentMemeSet();
        }
      );
      this.currentPage = $event.pageIndex;
    } else if ($event.pageIndex < this.currentPage) {
      this.memeService.paginator(this.prevUrl).subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          this.readCurrentMemeSet();
        }
      );
      this.currentPage = $event.pageIndex;
    }
    console.log(this.currentPage);

  }

  private loadMemes(): any {
    if (this.currentTab === 0) {
      this.screenReaderText.set('WhatPage', 'You are watching public memes from all users.');
      this.memeService.getAllSortFilter(this.selectedSort, this.selectedOrder, this.selectedFilter, this.filterValue).subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);

          this.readPaging(1);
          this.readCurrentMemeSet();
          return this.allMemes;
        }
      );
    }
    else {
      this.screenReaderText.set('WhatPage', 'You are watching your own memes.');
      this.memeService.getOwn().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);

          this.readPaging(1);
          this.readCurrentMemeSet();
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

  // Filter & Sort //
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

  submitChanged(): void {
    this.currentPage = 0;
    this.loadMemes();
  }

  // Dummy sort function to avoid maps get sorted alphabetic when using | keyvalue: asIsOrder
  asIsOrder(a, b): number {
    return 0;
  }

  // ScreenReader and its functions //
  public screenReader(): void {
    this.speechService.speak(this.screenReaderBuilder());
  }

  private screenReaderBuilder(): string {
    let text = '';
    text += this.screenReaderText.get('Welcome') + ' ';
    text += (this.screenReaderText.get('WhatPage') || '') + ' ';
    text += (this.screenReaderText.get('Amount') || '') + ' ';
    text += (this.screenReaderText.get('Paging') || '') + ' ';
    text += (this.screenReaderText.get('MemeTitles') || '') + ' ';
    return text;
  }

  private readPaging(page: number): void {
    if (!this.memeLength) { return; }
    this.screenReaderText.set('Paging', 'You are on page ' + page +
      ' of ' + (Math.floor(this.memeLength / 6) + 1) +
      ', showing ' + (this.memeLength >= 6 ? 6 : (this.memeLength % 6)) + ' memes.');
  }
  private readCurrentMemeSet(): void {
    if (!this.allMemes) { this.screenReaderText.set('Amount', 'No Memes are available.'); return; }

    this.screenReaderText.set('Amount', this.memeLength + ' Memes are available.');
    let memeTitles = '';
    let countEmpty = 0;
    this.allMemes.forEach(element => {
      if (element.title) {
        memeTitles += element.title + '! ';
      }
      else {
        countEmpty++;
      }
    });
    if (memeTitles) {
      memeTitles = 'The memes are called: ' + memeTitles;
    }
    if (countEmpty > 1) {
      memeTitles += 'There are ' + countEmpty + ' memes with no title.';
    }
    else if (countEmpty === 1) {
      memeTitles += 'There is 1 meme with no title.';
    }
    this.screenReaderText.set('MemeTitles', memeTitles);
  }

  public stopScreenReader(): void {
    this.speechService.stop();
  }

  // VoiceRecognition and its functions //
  private initVoiceRecognitionCommands(): void {
    const commands = {
      'start screen reader': () => {
        this.ngZone.run(() => this.voiceRecognitionService.voiceActionFeedback = 'Start Screen Reader');
        this.screenReader();
      },
      'open meme :pos': (pos: number) => {
        if (pos > 0 && pos <= 6) {
          this.ngZone.run(() => this.voiceRecognitionService.voiceActionFeedback = 'Start Screen Reader');
          this.router.navigate(['./meme/' + pos]);
        }
        else {
          this.ngZone.run(() => this.voiceRecognitionService.voiceActionFeedback = 'Open Meme ' + pos + ' not possible');
        }
      },
    };
    this.voiceRecognitionService.setUp(commands);
  }
}
