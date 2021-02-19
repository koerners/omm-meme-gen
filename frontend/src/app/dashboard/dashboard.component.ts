import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {map} from 'rxjs/operators';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {MemeService} from '../services/meme.service';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';
import {environment} from "../../environments/environment";

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
          {title: 'Top 5 Viewed Memes', cols: 2, rows: 1},
          {title: 'Corresponding Image', cols: 2, rows: 1},
          {title: 'Users Last Login', cols: 2, rows: 1}
        ];
      }

      return [
        {title: 'Top 5 Viewed Memes', cols: 1, rows: 1},
        {title: 'Corresponding Image', cols: 1, rows: 1},
        {title: 'Users Last Login', cols: 2, rows: 1}
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
  loginChartType = 'line';
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
      if (response.length < 4){
        console.log(response);
        return;
      }
      else {
        this.video = response;
      }
      console.log(this.video);
    }, null, _ => {
      this.video = environment.apiUrl + this.video;
      console.log(this.video);
      this.vid.nativeElement.setAttribute('src', this.video);
    });
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
        backgroundColor: '#47A31F',
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
    console.log(this.loginData.data);
    this.loginChartLabels = Array.from(this.loginData.data, ({day, month, year}) => day + '.' + month + '.' + year);
    this.loginChartColors = [
      {
        borderColor: 'black',
        backgroundColor: '#47A31F',
      },
    ];
    this.loginChartReady = true;
  }
}
