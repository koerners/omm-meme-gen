import {Component, NgZone, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {PageEvent} from '@angular/material/paginator';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {BreakpointObserver} from '@angular/cdk/layout';
import {Meme} from '../Meme';
import {MemeService} from '../services/meme.service';
import {SpeechService} from '../services/speech.service';
import {VoiceRecognitionService} from '../services/voice-recognition.service';

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
  screenReaderText: Map<string, string>;

  constructor(private memeService: MemeService, private ngZone: NgZone,
              private speechService: SpeechService, public voiceRecognitionService: VoiceRecognitionService) {
    this.screenReaderText = new Map<string, string>();
    this.screenReaderText.set('Welcome', 'This page is Meme Life Gallery.');
    this.initVoiceRecognitionCommands();
  }

  ngOnInit(): void {
    this.loadMemes(0);
  }

  getData($event: PageEvent): any {
    this.screenReaderText.set('Paging', 'You are on page ' + ($event.pageIndex + 1) +
      ' of ' + (Math.floor(this.memeLength / 6) + 1) +
      ', showing ' + ($event.pageIndex < Math.floor(this.memeLength / 6) ? 6 : (this.memeLength % 6)) + ' memes.');
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

  loadMemes(what: number): any {
    if (what === 0){
      this.screenReaderText.set('WhatPage', 'You´re watching public memes from all users.');
      this.memeService.getAll().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);

          this.screenReaderText.set('Paging', 'You are on page ' + 1 +
            ' of ' + (Math.floor(this.memeLength / 6) + 1) +
            ', showing ' + (this.memeLength >= 6 ? 6 : (this.memeLength % 6)) + ' memes.');
          this.readCurrentMemeSet();
          return this.allMemes;
        }
      );
    }
    if (what === 1){
      this.screenReaderText.set('WhatPage', 'You´re watching your own memes.');
      this.memeService.getOwn().subscribe(data => {
          this.allMemes = data.results;
          this.memeLength = data.count;
          this.nextUrl = data.next;
          this.prevUrl = data.previous;
          // console.log(this.nextUrl, this.prevUrl);

          this.screenReaderText.set('Paging', 'You are on page ' + 1 +
            ' of ' + (Math.floor(this.memeLength / 6) + 1) +
            ', showing ' + (this.memeLength >= 6 ? 6 : (this.memeLength % 6)) + ' memes.');
          this.readCurrentMemeSet();
          return this.allMemes;
        }
      );
    }
  }

  onTabChanged($event: MatTabChangeEvent): void {
    this.currentPage = 0;
    this.loadMemes($event.index);

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

  private readCurrentMemeSet(): void {
    this.screenReaderText.set('Amount', this.memeLength + 'Memes are available.');
    let memeTitles = '';
    let countEmpty = 0;
    this.allMemes.forEach(element => {
      if (element.title) {
        memeTitles += element.title + ' - ';
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
      test: () => {
        this.ngZone.run(() => this.voiceRecognitionService.voiceActionFeedback = 'Test');
        alert('test');
      },
    };
    this.voiceRecognitionService.setUp(commands);
  }
}
