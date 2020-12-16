import {Injectable} from '@angular/core';
import '@tensorflow/tfjs-backend-cpu';
import * as mobilenet from '@tensorflow-models/mobilenet';

export interface Prediction {
  className: string;
  probability: number;
  color: string;
}

@Injectable()
export class ObjectRecognitionService {
  public model: any;
  public loading = true;
  public predictions: Prediction[];
  public colors = ['#EF767A', '#456990', '#06BCC1', '#7D1538', '#134074', '#947BD3', '#596F62', '#7EA16B'];

  constructor() {
    this.model = null;
  }

  public predictObject(element): Promise<Prediction[]> {
    return this.makePredition(element);
  }

  async makePredition(element): Promise<Prediction[]> {
    if (this.model == null) {
      this.model = await mobilenet.load();
    }

    console.log(element);

    const im = new Image();
    im.src = element;
    im.width = 1000;
    im.height = 1000;
    this.predictions = await this.model.classify(im);
    this.predictions = this.addColors();
    return this.predictions;

  }


  private addColors(): Prediction[] {
    for (const entry of this.predictions) {
      entry.color = this.colors[Math.floor(Math.random() * this.colors.length)];
    }
    return this.predictions;
  }
}


