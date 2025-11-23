import { Location } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('lineCounterTextarea') lineCounterTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('txtEditorTextarea') txtEditorTextarea!: ElementRef<HTMLTextAreaElement>;

  lineCounter: string = '';
  txtEditor: string = '';
  lineCountCache: number = 0;
  url!: string;
  countdownTxt!: string

  private countdown: number = 0;
  private countdownInterval: any;
  private subscriptions: Array<Subscription> = []

  constructor(
    private socket: Socket,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private location: Location,
    private toastrSrv: ToastrService,
  ) {

  }

  ngOnInit(): void {

    this.socket.fromEvent('connect').subscribe(() => {
      console.log('Connected!', this.socket.ioSocket.id);
    });

    const id = this.location.path().replace('/', '');
    console.log(id);

    this.url = `${window.location.href}`;
    console.log(this.url);

    this.subscriptions.push(
      this.socket.fromEvent('_startTXT').subscribe(({ id, txt, createdAt, validUntil }: any) => {
        if (id) this.router.navigate(['', id]);
        this.txtEditor = txt;

        if (this.txtEditorTextarea) {
          this.txtEditorTextarea.nativeElement.value = txt;
        }

        this.line_counter();

        this.cdr.detectChanges();

        this.countdown = Math.round((new Date(validUntil).getTime() - new Date().getTime()) / 1000);
        this.startCountDown();
      })
    );

    this.subscriptions.push(
      this.socket.fromEvent<boolean>('_sizeExceeded').subscribe((res: boolean) => {
        if (res)
          this.toastrSrv.error('The TXT exceeded the size of 100Kb', 'Error')
      })
    );

    this.subscriptions.push(
      this.socket.fromEvent<boolean>('_txtNotExist').subscribe((res: boolean) => {
        if (res)
          this.subscriptions.push(this.toastrSrv.error('The TXT not exist, a new TXT will created.', 'Error', { easeTime: 1500 }).onHidden.subscribe(() => this.socket.emit('startTXT', {})))
      })
    );

    this.subscriptions.push(
      this.socket.fromEvent<boolean>('_deleteTXT').subscribe((res: boolean) => {
        if (res)
          this.subscriptions.push(this.toastrSrv.success('The TXT was deleted with success exist, a new TXT will created.', 'Error', { timeOut: 1500 }).onHidden.subscribe(() => this.socket.emit('startTXT', { id })));
        else
          this.subscriptions.push(this.toastrSrv.success('The TXT wasn\'t deleted mabe the TXT was deleted before, the page will be reloaded with new file', 'Error', { timeOut: 1500 }).onHidden.subscribe(() => this.socket.emit('startTXT', { id })))

      })
    );

    this.subscriptions.push(
      this.socket.fromEvent<any>('_updateTXT').subscribe(({ id, txt, createdAt, validUntil }: any) => {
        this.txtEditor = txt;
        this.countdown = Math.round((new Date(validUntil).getTime() - new Date().getTime()) / 1000);
        this.startCountDown();
      })
    );
    console.log("startTXT");

    this.socket.emit('startTXT', { id });
  }

  ngAfterViewInit() {
    this.lineCounterTextarea.nativeElement.value = this.lineCounter;
    this.txtEditorTextarea.nativeElement.value = this.txtEditor;
    this.line_counter();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    this.subscriptions.forEach(e => e.unsubscribe());
  }

  ngModelChange(txt: string) {
    const id = this.location.path().replace('/', '');
    this.socket.emit('updateTXT', { id, txt });
  }

  onTxtEditorScroll() {
    this.lineCounterTextarea.nativeElement.scrollTop = this.txtEditorTextarea.nativeElement.scrollTop;
    this.lineCounterTextarea.nativeElement.scrollLeft = this.txtEditorTextarea.nativeElement.scrollLeft;
  }

  onTxtEditorInput() {
    this.line_counter();
  }

  onTxtEditorKeydown(event: KeyboardEvent) {
    const { key } = event;
    const { value, selectionStart, selectionEnd } = this.txtEditorTextarea.nativeElement;
    if (key === 'Tab') {  // TAB = 9
      event.preventDefault();
      this.txtEditorTextarea.nativeElement.value = value.slice(0, selectionStart) + '\t' + value.slice(selectionEnd);
      this.txtEditorTextarea.nativeElement.setSelectionRange(selectionStart + 2, selectionStart + 1);
    }
  }

  line_counter() {
    const lineCount = this.txtEditorTextarea.nativeElement.value.split('\n').length;
    const outarr = new Array<string>();
    if (this.lineCountCache !== lineCount) {
      for (let x = 0; x < lineCount; x++) {
        outarr[x] = (x + 1) + '.';
      }
      this.lineCounter = outarr.join('\n');
    }
    this.lineCountCache = lineCount;
  }


  private startCountDown() {
    if (this.countdownInterval)
      clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
      }
      this.countdownTxt = this.formatTime(this.countdown);
    }, 1000);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    const secsStr = secs < 10 ? `0${secs}` : `${secs}`;

    return `${minsStr}:${secsStr}`;
  }

}
