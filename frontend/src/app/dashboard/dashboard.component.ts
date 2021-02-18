import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {map} from 'rxjs/operators';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {MemeService} from '../services/meme.service';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements  AfterViewInit{
  /** Based on the screen size, switch from standard to one column per row */
  cards = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map(({matches}) => {
      if (matches) {
        return [
          {title: 'Card 1', cols: 2, rows: 1},
          {title: 'Card 2', cols: 2, rows: 1},
          {title: 'Card 3', cols: 2, rows: 1},
          {title: 'Card 4', cols: 2, rows: 1}
        ];
      }

      return [
        {title: 'Card 1', cols: 1, rows: 1},
        {title: 'Card 2', cols: 1, rows: 1},
        {title: 'Card 3', cols: 1, rows: 1},
        {title: 'Card 4', cols: 1, rows: 1}
      ];
    })
  );
  @ViewChild('video')
  public vid: ElementRef;

  @ViewChild('canvas')
  public canvas: ElementRef;
  rowHeight = 400;
  chartRowHeight = this.rowHeight - 80;
  private topMemes;
  topMemeChartData: ChartDataSets[];
  topMemeChartLegend = true;
  topMemeChartPlugins = [];
  topMemeChartType = 'bar';
  topMemeChartColors: Color[];
  topMemeChartOptions;
  topMemeChartLabels: Label[];
  chartReady;
  loginChartData: ChartDataSets[];
  loginChartLegend = true;
  loginChartPlugins = [];
  loginChartType = 'bar';
  loginChartColors: Color[];
  loginChartOptions;
  loginChartLabels: Label[];
  loginChartReady;
  private loginData: { data: any };
  private videoCanvas: any;
  video;
  private loadString: any;
  constructor(private breakpointObserver: BreakpointObserver, private memeService: MemeService) {
    this.loadStatistics();
    this.loadVideo();
  }

  ngAfterViewInit(): void {}

  loadStatistics(): void {
    this.memeService.loadStatistics().subscribe(response => {
        const data = response.map((e) => {
          return {title: e.title, view: e.views};
        });
        this.topMemes = {data};
      },
      null,
      () => this.drawTopMemeChart());

    this.memeService.loadUserStats().subscribe(response => {
        const data = response.map((e) => {
          return {day: e.day, month: e.month, year: e.year, date: e.date, count: e.count};
        });
        this.loginData = {data};
        console.log(this.loginData);
      },
      null,
      () => this.drawUserChart());
  }
  loadVideo(): void{
    this.memeService.loadTopMemeVideo().subscribe(response => {
      const videoString = response;
      this.loadString = videoString;
    }, null,
      _ => {
        this.video = 'data:video/mp4;base64,' + this.loadString.substring(2);
    });
  }
  capture(event): void {
    event.preventDefault();
    const context = this.canvas.nativeElement.getContext('2d').drawImage(this.video.nativeElement, 0, 0, 1024, 768);
  }
  drawTopMemeChart(): void{
    console.log(this.topMemes);
    const chartData = Array.from(this.topMemes.data, ({view}) => view );
    this.topMemeChartData = [
      { data: chartData, label: 'Top 5 Most viewed Memes' },
    ];

    this.topMemeChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
    };
    this.topMemeChartLabels = Array.from(this.topMemes.data, ({title}) => title );
    console.log(this.topMemeChartLabels);
    this.topMemeChartColors = [
      {
        borderColor: 'black',
        backgroundColor: 'rgba(25,5,255,0.38)',
      },
    ];
    this.chartReady = true;
  }
    private drawUserChart(): void{
    const chartData = Array.from(this.loginData.data, ({count}) => count);
    this.loginChartData = [
      { data: chartData, label: 'Last Login of Users' },
    ];

    this.loginChartOptions = {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
            stepSize: 1
          }
        }]
      }

    };
    this.loginChartLabels = Array.from(this.loginData.data, ({day, month, year}) => day + 'D ' + month + 'M ' + year + 'Y'   );
    this.loginChartColors = [
      {
        borderColor: 'black',
        backgroundColor: 'rgba(25,5,255,0.38)',
      },
    ];
    this.loginChartReady = true;
  }
}
