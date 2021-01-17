import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {DashboardComponent} from './dashboard/dashboard.component';
import {AppRoutingModule} from './app-routing.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {NavbarComponent} from './navbar/navbar.component';
import {LayoutModule} from '@angular/cdk/layout';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatListModule} from '@angular/material/list';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatCardModule} from '@angular/material/card';
import {MatMenuModule} from '@angular/material/menu';
import {GeneratorComponent} from './generator/generator.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {ColorCircleModule} from 'ngx-color/circle';
import {HTTP_INTERCEPTORS, HttpClientModule} from '@angular/common/http';
import {HttpConfigInterceptor} from './interceptor/httpconfig.interceptor';
import {ErrorDialogComponent} from './error-dialog/errordialog.component';
import {ErrorDialogService} from './error-dialog/errordialog.service';
import {LoginService} from './services/login.service';
import {MatDialogModule} from '@angular/material/dialog';
import {RegisterComponent} from './register/register.component';
import {MatSelectModule} from '@angular/material/select';
import {MatRadioModule} from '@angular/material/radio';
import {MatSnackBarModule} from '@angular/material/snack-bar';

import {MatChipsModule} from '@angular/material/chips';
import {RegisterService} from './services/register.service';
import {WebcamModule} from 'ngx-webcam';
import {MemeService} from './services/meme.service';
import { DetailViewComponent } from './detail-view/detail-view.component';
import {ObjectRecognitionService} from './services/object-recognition-service';
import {MatTableModule} from '@angular/material/table';
import {MatSliderModule} from '@angular/material/slider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import { MyMemesComponent } from './my-memes/my-memes.component';
import {MatTabsModule} from '@angular/material/tabs';
import {MatPaginatorModule} from '@angular/material/paginator';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    NavbarComponent,
    GeneratorComponent,
    ErrorDialogComponent,
    RegisterComponent,
    DetailViewComponent,
    MyMemesComponent,
  ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        MatToolbarModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatIconModule,
        LayoutModule,
        MatSidenavModule,
        MatListModule,
        MatGridListModule,
        MatCardModule,
        MatMenuModule,
        ReactiveFormsModule,
        MatInputModule,
        FormsModule,
        ColorCircleModule,
        HttpClientModule,
        MatDialogModule,
        MatSelectModule,
        MatRadioModule,
        MatSnackBarModule,
        MatTableModule,
        MatChipsModule,
        WebcamModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatTabsModule,
        MatPaginatorModule
    ],
  providers: [
    {provide: HTTP_INTERCEPTORS, useClass: HttpConfigInterceptor, multi: true},
    ErrorDialogService,
    LoginService,
    RegisterService,
    MemeService,
    ObjectRecognitionService
  ],
  entryComponents: [ErrorDialogComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
