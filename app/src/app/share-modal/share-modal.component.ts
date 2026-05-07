import { Clipboard } from '@angular/cdk/clipboard';
import { Component } from '@angular/core';

@Component({
  selector: 'app-share-modal',
  templateUrl: './share-modal.component.html',
  styleUrls: ['./share-modal.component.scss']
})
export class ShareModalComponent {
  get url(): string {
    return window.location.href;
  }

  get encodedUrl(): string {
    return encodeURIComponent(this.url);
  }

  constructor(private clipboard: Clipboard) {}

  copyToClipboard() {
    this.clipboard.copy(this.url);
  }
}
