import { Clipboard } from '@angular/cdk/clipboard';
import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-share-modal',
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss']
})
export class ShareModalComponent {

  url!: string;

  constructor(private location: Location, private clipboard: Clipboard) {
    this.url = `${window.location.href}`;

  }

  copyToClipboard() {
    const id = this.location.path().replace('/', '');
    this.clipboard.copy(id);
  }
}
