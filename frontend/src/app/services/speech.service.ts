import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  public voices: SpeechSynthesisVoice[];
  public selectedVoice: SpeechSynthesisVoice | null;
  private defaultVoiceName = 'Google UK English Male';

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
          return i.name.indexOf(this.defaultVoiceName) > -1;
        });
        // Fallback: If selected voice not available (OS depending) take the first available
        if (!this.selectedVoice) {
          this.selectedVoice = ( this.voices[0] || null );
        }
      }
    );
  }

  // Synthesize speech from the current text for the selected voice.
  public speak(text: string): void {
    if (!this.selectedVoice || !text) { return; }
    this.stop();
    this.synthesizeSpeechFromText(this.selectedVoice, 1, text);

    // Chrome Bug stops speech out after 15s
    const synthesisInterval = setInterval(() => {
      if (!speechSynthesis.speaking) {
        clearInterval(synthesisInterval);
      } else {
        console.log('extending voice out by pause/resume (Chrome Bug)');
        speechSynthesis.pause();
        speechSynthesis.resume();
      }
    }, 14000);
  }

  // Synthesize speech from the current text for the selected voice.
  public demo(): void {
    if (!this.selectedVoice) { return; }
    this.stop();
    this.synthesizeSpeechFromText(this.selectedVoice, 1, 'I’m the Dude, so that’s what you call me. That or, uh, His Dudeness, or uh, Duder, or El Duderino, if you’re not into the whole brevity thing.');
  }

  // Stop any current speech synthesis.
  public stop(): void {
    if (speechSynthesis.speaking) {
      console.log('speech aborted by stop()');
      speechSynthesis.cancel();
    }
  }

  // Performs the low-level speech synthesis for the given voice, rate, and text.
  private synthesizeSpeechFromText(
    voice: SpeechSynthesisVoice,
    rate: number,
    text: string
  ): void {
    const utterance = new SpeechSynthesisUtterance( text );
    utterance.voice = voice;
    utterance.rate = rate;
    utterance.onend = () => {
      speechSynthesis.cancel();
    };
    speechSynthesis.speak( utterance );
  }
}
