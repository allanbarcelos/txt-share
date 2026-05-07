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
    const id = this.location.path().replace('/', '');
    const file = new Blob([this.txtEditor], { type: 'text/plain' });
    const objectUrl = URL.createObjectURL(file);
    const element = document.createElement('a');
    element.href = objectUrl;
    element.download = `${id || 'txt-share'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(objectUrl);
  }

  deleteTXT() {
    const id = this.location.path().replace('/', '');
    if (!id) return;
    this.socket.emit('deleteTXT', { id });
  }

  renewTXT() {
    const id = this.location.path().replace('/', '');
    if (!id) return;
    this.socket.emit('renewTXT', { id });
  }

  openModal(content: TemplateRef<any>) {
    this.modalSrv.open(content, { ariaLabelledBy: 'modal-basic-title' });
  }

}
