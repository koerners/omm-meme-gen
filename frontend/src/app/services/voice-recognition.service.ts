import {Injectable, NgZone} from '@angular/core';
import {SpeechService} from './speech.service';
import {Router} from '@angular/router';

declare const annyang: any;
declare const SpeechKITT: any;

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {

  voiceFeedbackEnabled = false;
  voiceFeedbackShowHelp = false;
  voiceStatusMsg: any;
  voiceActionFeedback: any;
  voiceActionSuccess = false;

  constructor(private ngZone: NgZone, private router: Router, private speechService: SpeechService) {
    if (annyang) {
      this.initVoiceRecognition();
    }
  }

  public setUp(commands): void {
    if (annyang) {
      this.closeVoiceFeedback();
      annyang.removeCommands();
      this.initVoiceRecognitionCommands();
      annyang.addCommands(commands);
    }
  }

  public closeVoiceFeedback(): void {
    this.ngZone.run(() => this.voiceFeedbackEnabled = false);
    this.ngZone.run(() => this.voiceStatusMsg = undefined);
    this.ngZone.run(() => this.voiceActionFeedback = undefined);

    if (annyang){
      SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
      annyang.abort();
    }
  }

  private initVoiceRecognition(): void {
    console.log('initVoiceRecognition()');
    if (annyang) {
      // Use KITT with annyang
      SpeechKITT.annyang();
      SpeechKITT.setInstructionsText('You can start talking.');
      SpeechKITT.setSampleCommands(['Say "help me" to get all available comments.']);
      this.initVoiceRecognitionCallback();
      this.initVoiceRecognitionCommands();
      SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
      SpeechKITT.vroom();
    }
  }

  private initVoiceRecognitionCallback(): void {
    SpeechKITT.setStartCommand( () => {
      this.ngZone.run(() => this.voiceFeedbackEnabled = true);
      this.ngZone.run(() => this.voiceStatusMsg = 'Start Talking...');
      this.ngZone.run(() => this.voiceActionFeedback = undefined);
      this.speechService.stop();
      annyang.start();
    });

    annyang.addCallback('soundstart', (res) => {
      this.ngZone.run(() => this.voiceStatusMsg = 'Listening... (after your command please be patient while your input is processed)');
      this.ngZone.run(() => this.voiceActionFeedback = undefined);
      this.ngZone.run(() => this.voiceActionSuccess = true);
      SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat-turquoise.css');
    });

    annyang.addCallback('resultMatch', (userSaid) => {
      const queryText: any = userSaid[0];
      annyang.abort();
      // SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
      this.ngZone.run(() => this.voiceStatusMsg = 'Command detected...');
    });

    annyang.addCallback('resultNoMatch', (userSaid) => {
      const queryText: any = userSaid[0];
      annyang.abort();
      // SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
      this.ngZone.run(() => this.voiceStatusMsg = 'Sorry I did not understand what you want. You said: ' + queryText);
      this.ngZone.run(() => this.voiceActionSuccess = false);
    });

    annyang.addCallback('error', (err) => {
      this.ngZone.run(() => this.voiceActionSuccess = false);
      this.voiceStatusMsg = 'Speech recognition did not work. ';
      if (err.error === 'network'){
        this.ngZone.run(() => this.voiceStatusMsg += 'Can\'t connect annyang voice service');
        annyang.abort();
      } else if (err.error === 'permissionBlocked') {
        this.ngZone.run(() => this.voiceStatusMsg += 'Your browser blocks the permission request to use Speech Recognition.');
        annyang.abort();
      } else if (err.error === 'permissionDenied') {
        this.ngZone.run(() => this.voiceStatusMsg += 'You blocked the permission request to use Speech Recognition.');
        annyang.abort();
      } else {
        annyang.abort();
      }
    });

    annyang.addCallback('end', () => {
      SpeechKITT.setStylesheet('//cdnjs.cloudflare.com/ajax/libs/SpeechKITT/1.0.0/themes/flat.css');
      annyang.abort();
    });
  }

  private initVoiceRecognitionCommands(): void {
    const commands = {
      'echo *text': (text: string) => {
        console.log('Echo: ' + text);
        this.ngZone.run(() => this.voiceActionFeedback = 'Echo: ' + text);
        alert(text);
      },
      'navigate dashboard': () => {
        this.ngZone.run(() => this.voiceActionFeedback = 'Open Dashboard');
        this.router.navigate(['./dashboard']);
      },
      'navigate generate': () => {
        this.ngZone.run(() => this.voiceActionFeedback = 'Open Generate');
        this.router.navigate(['./memes']);
      },
      'navigate memes': () => {
        this.ngZone.run(() => this.voiceActionFeedback = 'Open Memes');
        this.router.navigate(['./memes']);
      },
      'help me': () => {
        this.ngZone.run(() => this.voiceActionFeedback = 'Show help');
        this.ngZone.run(() => this.voiceFeedbackShowHelp = true);
      },
      'close help': () => {
        this.ngZone.run(() => this.voiceActionFeedback = 'Close help');
        this.ngZone.run(() => this.voiceFeedbackShowHelp = false);
      },
    };
    annyang.addCommands(commands);
  }
}
