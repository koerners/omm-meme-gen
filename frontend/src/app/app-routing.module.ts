import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {DashboardComponent} from './dashboard/dashboard.component';
import {GeneratorComponent} from './generator/generator.component';
import {RegisterComponent} from './register/register.component';
import {DetailViewComponent} from './detail-view/detail-view.component';


const routes: Routes = [
  {path: '', redirectTo: '/dashboard', pathMatch: 'full'},
  {path: 'dashboard', component: DashboardComponent},
  {path: 'generator', component: GeneratorComponent},
  {path: 'register', component: RegisterComponent},
  {path: 'meme/:id', component: DetailViewComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
