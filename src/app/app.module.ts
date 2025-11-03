import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { SocketIoConfig, SocketIoModule } from 'ngx-socket-io';
import { ToastrModule } from 'ngx-toastr';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { InfoModalComponent } from './info-modal/info-modal.component';
import { ShareModalComponent } from './share-modal/share-modal.component';

const host = window.location.origin;
const segments = window.location.pathname.split('/').filter(Boolean);

const lastSegment = segments[segments.length - 1];

const idPattern = /^[a-zA-Z0-9_-]{8,}$/;

if (idPattern.test(lastSegment)) {
  segments.pop();
}

const basePath = '/' + segments.join('/');

const config: SocketIoConfig = {
  url: host,
  options: {
    path: `${basePath}/socket.io`
  }
};


@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    InfoModalComponent,
    ShareModalComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SocketIoModule.forRoot(config),
    BrowserAnimationsModule, // required animations module
    ToastrModule.forRoot({
      toastClass: 'ngx-toastr mt-3',
      closeButton: true,
      progressBar: true,
      timeOut: 10000,
      positionClass: 'toast-top-center',
      preventDuplicates: true,
    }), // ToastrModule added
    NgbModalModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule { }
