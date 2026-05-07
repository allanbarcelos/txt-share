import { Location } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Socket } from 'ngx-socket-io';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';

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
  countdownTxt!: string;

  private countdown: number = 0;
  private countdownInterval: any;
  private destroy$ = new Subject<void>();

  constructor(
    private socket: Socket,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private location: Location,
    private toastrSrv: ToastrService,
  ) {}

  ngOnInit(): void {
    this.socket.fromEvent('connect').pipe(takeUntil(this.destroy$)).subscribe(() => {
      console.log('Connected!', this.socket.ioSocket.id);
    });

    const id = this.location.path().replace('/', '');
    this.url = `${window.location.href}`;

    this.socket.fromEvent('_startTXT').pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ id, txt, validUntil }: any) => {
      if (id) this.router.navigate(['', id]);
      this.txtEditor = txt;

      if (this.txtEditorTextarea) {
        this.txtEditorTextarea.nativeElement.value = txt;
      }

      this.line_counter();
      this.cdr.detectChanges();

      this.countdown = Math.round((new Date(validUntil).getTime() - Date.now()) / 1000);
      this.startCountDown();
    });

    this.socket.fromEvent<any>('_sizeExceeded').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.toastrSrv.error('The TXT exceeded the size of 100Kb', 'Error');
    });

    this.socket.fromEvent<any>('_txtNotExist').pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.toastrSrv.error('TXT not found, a new one will be created.', 'Error', { easeTime: 1500 })
        .onHidden.pipe(take(1)).subscribe(() => this.socket.emit('startTXT', {}));
    });

    this.socket.fromEvent<any>('_deleteTXT').pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ success }: any) => {
      const msg = success
        ? 'TXT deleted. A new one will be created.'
        : 'TXT was already deleted. Redirecting to a new one.';
      this.toastrSrv.success(msg, 'Info', { timeOut: 1500 })
        .onHidden.pipe(take(1)).subscribe(() => this.socket.emit('startTXT', {}));
    });

    this.socket.fromEvent<any>('_updateTXT').pipe(
      takeUntil(this.destroy$)
    ).subscribe(({ txt, validUntil }: any) => {
      this.txtEditor = txt;
      this.countdown = Math.round((new Date(validUntil).getTime() - Date.now()) / 1000);
      this.startCountDown();
    });

    this.socket.emit('startTXT', { id: id || undefined });
  }

  ngAfterViewInit() {
    this.lineCounterTextarea.nativeElement.value = this.lineCounter;
    this.txtEditorTextarea.nativeElement.value = this.txtEditor;
    this.line_counter();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    this.destroy$.next();
    this.destroy$.complete();
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
    if (event.key !== 'Tab') return;

    event.preventDefault();
    const el = this.txtEditorTextarea.nativeElement;
    const { value, selectionStart, selectionEnd } = el;
    el.value = value.slice(0, selectionStart) + '\t' + value.slice(selectionEnd);
    el.setSelectionRange(selectionStart + 1, selectionStart + 1);
  }

  line_counter() {
    const lineCount = this.txtEditorTextarea.nativeElement.value.split('\n').length;
    if (this.lineCountCache !== lineCount) {
      const outarr = new Array<string>(lineCount);
      for (let x = 0; x < lineCount; x++) {
        outarr[x] = (x + 1) + '.';
      }
      this.lineCounter = outarr.join('\n');
      this.lineCountCache = lineCount;
    }
  }

  private startCountDown() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
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
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}
