import {Injectable} from '@angular/core';
import {ErrorDialogService} from '../error-dialog/errordialog.service';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';

import {Observable, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';

@Injectable()
export class HttpConfigInterceptor implements HttpInterceptor {
  private request: HttpRequest<any>;

  constructor(public errorDialogService: ErrorDialogService) {
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    this.request = request;
    const idToken = localStorage.getItem('access');
    if (idToken) {
      this.request = request.clone({
        headers: request.headers.set('Authorization',
          'Bearer ' + idToken)
      });
    }

    return next.handle(this.request).pipe(
      map((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          console.log('event--->>>', event);
        }
        return event;
      }),
      catchError((error: HttpErrorResponse) => {
        let data: {};
        if (error.status === 0){
          data = {
            reason: 'HTTP Error',
            status: 'The server is not reachable.'
          };
        }
        else {
          data = {
            reason: error.statusText,
            status: error.error
          };
        }

        this.errorDialogService.openDialog(data);
        return throwError(error);
      }));
  }
}
