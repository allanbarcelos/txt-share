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

const config: SocketIoConfig = { url: '/', options: { path: './socket.io' } }; // Substitua pela URL correta do seu servidor

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
