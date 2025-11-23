import { Location } from '@angular/common';
import { Component, Input, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Socket } from 'ngx-socket-io';
import { InfoModalComponent } from '../info-modal/info-modal.component';
import { ShareModalComponent } from '../share-modal/share-modal.component';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  @Input() txtEditor!: string;
  @Input() countdownTxt!: string;

  infoModal!: any;
  shareModal!: any;

  constructor(
    private modalSrv: NgbModal,
    private location: Location,
    private socket: Socket
  ) {
    this.infoModal = InfoModalComponent;
    this.shareModal = ShareModalComponent;
  }

  newTxt() {
    this.socket.emit('startTXT', {})
  }

  downloadTXT() {
    const element = document.createElement('a');
    const file = new Blob([this.txtEditor], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    const id = this.location.path().replace('/', '');
    element.download = `${id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  deleteTXT() {
    const id = this.location.path().replace('/', '');
    this.socket.emit('deleteTXT', { id });
  }

  renewTXT() {
    const id = this.location.path().replace('/', '');
    this.socket.emit('renewTXT', { id });
  }

  openModal(content: TemplateRef<any>) {
    this.modalSrv.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(
      (result) => {
        console.log(result);
      },
      (reason) => {
        console.log(reason);
      },
    );
  }

}
