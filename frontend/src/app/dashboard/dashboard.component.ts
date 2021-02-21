import {Component, NgZone} from '@angular/core';
import {map} from 'rxjs/operators';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {User} from '../User';
import {MemeService} from '../services/meme.service';
import {SpeechService} from '../services/speech.service';
import {VoiceRecognitionService} from '../services/voice-recognition.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  /** Based on the screen size, switch from standard to one column per row */
  cards = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(({matches}) => {
      if (matches) {
        return [
          {title: 'Card 1', cols: 1, rows: 1},
          {title: 'Card 2', cols: 1, rows: 1},
          {title: 'Card 3', cols: 1, rows: 1},
          {title: 'Card 4', cols: 1, rows: 1}
        ];
      }

      return [
        {title: 'Card 1', cols: 2, rows: 1},
        {title: 'Card 2', cols: 1, rows: 1},
        {title: 'Card 3', cols: 1, rows: 2},
        {title: 'Card 4', cols: 1, rows: 1}
      ];
    })
  );
  private user: User;
  screenReaderText: Map<string, string>;

  constructor(private breakpointObserver: BreakpointObserver, private memeService: MemeService, private ngZone: NgZone,
              private speechService: SpeechService, public voiceRecognitionService: VoiceRecognitionService) {
    this.screenReaderText = new Map<string, string>();
    this.screenReaderText.set('Welcome', 'This page is Meme Life Dashboard.');
    this.initVoiceRecognitionCommands();
  }

  // ScreenReader and its functions //
  public screenReader(): void {
    this.speechService.speak(this.screenReaderBuilder());
  }

  private screenReaderBuilder(): string {
    let text = '';
    text += this.screenReaderText.get('Welcome') + ' ';
    return text;
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
    };
    this.voiceRecognitionService.setUp(commands);
  }
}
