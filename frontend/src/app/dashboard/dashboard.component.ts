import {AfterViewInit, Component, OnInit} from '@angular/core';
import {map} from 'rxjs/operators';
import {BreakpointObserver, Breakpoints} from '@angular/cdk/layout';
import {User} from '../User';
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

  constructor(private breakpointObserver: BreakpointObserver, private memeService: MemeService) {
    this.loadStatistics();
  }

  ngAfterViewInit(): void {}

  loadStatistics(): void{
    this.memeService.loadStatistics().subscribe(response => {
        const data = response.map((e) => {
          return {title: e.title, view: e.views };
        });
        this.topMemes = {data};
        console.log(this.topMemes);
      },
      null,
      () => this.drawTopMemeChart() );
  }
  drawTopMemeChart(): void{
    console.log(this.topMemes);
    const chartData = Array.from(this.topMemes.data, ({view}) => view );
    this.topMemeChartData = [
      { data: chartData, label: 'Top 5 Most viewed Memes' },
    ];
    console.log(this.topMemeChartData);

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
}

