import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  public voices: SpeechSynthesisVoice[];
  public selectedVoice: SpeechSynthesisVoice | null;
  private preferredVoice = 'Google UK English Male';

  constructor(){
    // Speech out
    this.voices = [];
    this.selectedVoice = null;
    this.initSpeech();
  }

  private initSpeech(): void {
    // The voices aren't immediately available (or so it seems). We need to wait for
    // the "voiceschanged" event to fire before we can access them.
    speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        this.voices = speechSynthesis.getVoices();
        this.selectedVoice = this.voices.find(i => {
          return i.name.indexOf(this.preferredVoice) > -1;
        });
      }
    );
  }

  // Synthesize speech from the current text for the selected voice.
  public speak(text: string): void {
    if (!text) {
      console.log('SpeechSynthesis: Cannot talk, nothing to say.');
      return;
    }
    this.stop();
    console.log('SpeechSynthesis: ' + text);
    this.synthesizeSpeechFromText(this.selectedVoice, 1, text);

    // Chrome Bug stops speech out after 15s, does not work good with Firefox
    const synthesisInterval = setInterval(() => {
      if (!speechSynthesis.speaking) {
        clearInterval(synthesisInterval);
      } else {
        console.log('SpeechSynthesis: extending voice out by pause/resume (Chrome Bug), causes delays in Firefox.');
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 14000);
  }

  // Synthesize speech from the current text for the selected voice.
  public demo(): void {
    this.stop();
    this.synthesizeSpeechFromText(this.selectedVoice, 1, 'I’m the Dude, so that’s what you call me. That or, uh, His Dudeness, or uh, Duder, or El Duderino, if you’re not into the whole brevity thing.');
  }

  // Stop any current speech synthesis.
  public stop(): void {
    if (speechSynthesis.speaking) {
      console.log('SpeechSynthesis: speech aborted by stop()');
      speechSynthesis.cancel();
    }
  }

  // Performs the low-level speech synthesis for the given voice, rate, and text.
  private synthesizeSpeechFromText(voice: SpeechSynthesisVoice, rate: number, text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    // if preferred voice is not available choose by language
    if (voice) {
      utterance.voice = voice;
    }
    else {
      utterance.lang = 'en-us';
    }
    utterance.rate = rate;
    utterance.onend = () => {
      speechSynthesis.cancel();
    };
    speechSynthesis.speak(utterance);
  }
}
