import { Location } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Socket } from 'ngx-socket-io';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject } from 'rxjs';
import { AppComponent } from './app.component';

// ─── Mocks ────────────────────────────────────────────────────────────────────

class MockSocket {
  private subjects = new Map<string, Subject<any>>();
  emit = jasmine.createSpy('emit');
  ioSocket = { id: 'test-socket-id' };

  fromEvent<T>(event: string): Observable<T> {
    if (!this.subjects.has(event)) this.subjects.set(event, new Subject<T>());
    return this.subjects.get(event)!.asObservable();
  }

  trigger(event: string, data: any) {
    this.subjects.get(event)?.next(data);
  }
}

function makeToastRef() {
  const onHidden = new Subject<void>();
  return { onHidden, _hide: () => onHidden.next() };
}

class MockToastrService {
  error  = jasmine.createSpy('error').and.callFake(() => makeToastRef());
  success = jasmine.createSpy('success').and.callFake(() => makeToastRef());
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_UNTIL_1H = () => new Date(Date.now() + 3_600_000).toISOString();

const START_TXT_DATA = () => ({
  id: 's_abc1234',
  txt: 'Hello world',
  createdAt: new Date().toISOString(),
  validUntil: VALID_UNTIL_1H(),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let mockSocket: MockSocket;
  let mockToastr: MockToastrService;

  beforeEach(async () => {
    mockSocket = new MockSocket();
    mockToastr = new MockToastrService();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [RouterTestingModule.withRoutes([]), FormsModule],
      providers: [
        { provide: Socket, useValue: mockSocket },
        { provide: ToastrService, useValue: mockToastr },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  // ── Creation ────────────────────────────────────────────────────────────────

  describe('creation', () => {
    it('should create', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should emit startTXT on init with no id in URL', () => {
      fixture.detectChanges();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', { id: undefined });
    });

    it('should emit startTXT with id when URL contains session id', () => {
      spyOn(TestBed.inject(Location), 'path').and.returnValue('/s_abc1234');
      fixture.detectChanges();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', { id: 's_abc1234' });
    });

  });

  // ── _startTXT event ─────────────────────────────────────────────────────────

  describe('socket event: _startTXT', () => {
    beforeEach(() => fixture.detectChanges());

    it('should update txtEditor with received text', () => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      expect(component.txtEditor).toBe('Hello world');
    });

    it('should set textarea value to received text', () => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      expect(component['txtEditorTextarea'].nativeElement.value).toBe('Hello world');
    });

    it('should update line counter after receiving text', () => {
      mockSocket.trigger('_startTXT', { ...START_TXT_DATA(), txt: 'line1\nline2\nline3' });
      expect(component.lineCounter).toContain('3.');
    });

    it('should start countdown from validUntil', fakeAsync(() => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      tick(1000);
      expect(component.countdownTxt).toBe('59:59');
      discardPeriodicTasks();
    }));

    it('should display 00:00 when countdown expires', fakeAsync(() => {
      const nearExpiry = new Date(Date.now() + 1000).toISOString();
      mockSocket.trigger('_startTXT', { ...START_TXT_DATA(), validUntil: nearExpiry });
      tick(1000);
      expect(component.countdownTxt).toBe('00:00');
      discardPeriodicTasks();
    }));
  });

  // ── _updateTXT event ────────────────────────────────────────────────────────

  describe('socket event: _updateTXT', () => {
    beforeEach(() => fixture.detectChanges());

    it('should update txtEditor', () => {
      mockSocket.trigger('_updateTXT', { txt: 'Updated content', validUntil: VALID_UNTIL_1H() });
      expect(component.txtEditor).toBe('Updated content');
    });

    it('should sync textarea DOM value', () => {
      mockSocket.trigger('_updateTXT', { txt: 'Remote text', validUntil: VALID_UNTIL_1H() });
      expect(component['txtEditorTextarea'].nativeElement.value).toBe('Remote text');
    });

    it('should update line counter after remote update', () => {
      mockSocket.trigger('_updateTXT', { txt: 'line1\nline2\nline3', validUntil: VALID_UNTIL_1H() });
      expect(component.lineCounter).toContain('3.');
    });

    it('should reset countdown from new validUntil', fakeAsync(() => {
      mockSocket.trigger('_updateTXT', {
        txt: 'x',
        validUntil: new Date(Date.now() + 1800000).toISOString(), // 30 min
      });
      tick(1000);
      expect(component.countdownTxt).toBe('29:59');
      discardPeriodicTasks();
    }));
  });

  // ── _error event ────────────────────────────────────────────────────────────

  describe('socket event: _error', () => {
    beforeEach(() => fixture.detectChanges());

    it('should show an error toast with the server message', () => {
      mockSocket.trigger('_error', { message: 'Failed to start TXT' });
      expect(mockToastr.error).toHaveBeenCalledWith('Failed to start TXT', 'Error');
    });

    it('should show a generic message when _error has no message', () => {
      mockSocket.trigger('_error', {});
      expect(mockToastr.error).toHaveBeenCalledWith('An unexpected error occurred.', 'Error');
    });
  });

  // ── _sizeExceeded event ─────────────────────────────────────────────────────

  describe('socket event: _sizeExceeded', () => {
    it('should show error toast', () => {
      fixture.detectChanges();
      mockSocket.trigger('_sizeExceeded', {});
      expect(mockToastr.error).toHaveBeenCalledWith('The TXT exceeded the size of 100Kb', 'Error');
    });
  });

  // ── _txtNotExist event ──────────────────────────────────────────────────────

  describe('socket event: _txtNotExist', () => {
    beforeEach(() => fixture.detectChanges());

    it('should show error toast', () => {
      mockSocket.trigger('_txtNotExist', {});
      expect(mockToastr.error).toHaveBeenCalled();
    });

    it('should emit startTXT when toast hides', () => {
      mockSocket.trigger('_txtNotExist', {});
      const toastRef = mockToastr.error.calls.mostRecent().returnValue;
      toastRef._hide();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', {});
    });

    it('should only emit startTXT once even if toast hidden multiple times', () => {
      mockSocket.emit.calls.reset();
      mockSocket.trigger('_txtNotExist', {});
      const toastRef = mockToastr.error.calls.mostRecent().returnValue;
      toastRef._hide();
      toastRef._hide();
      const startTxtCalls = mockSocket.emit.calls.all()
        .filter((c: any) => c.args[0] === 'startTXT');
      expect(startTxtCalls.length).toBe(1);
    });
  });

  // ── _deleteTXT event ────────────────────────────────────────────────────────

  describe('socket event: _deleteTXT', () => {
    beforeEach(() => fixture.detectChanges());

    it('should show success toast when delete succeeded', () => {
      mockSocket.trigger('_deleteTXT', { success: true });
      expect(mockToastr.success).toHaveBeenCalled();
    });

    it('should show toast when TXT was already deleted', () => {
      mockSocket.trigger('_deleteTXT', { success: false });
      expect(mockToastr.success).toHaveBeenCalled();
    });

    it('should emit startTXT when toast hides after success', () => {
      mockSocket.trigger('_deleteTXT', { success: true });
      const toastRef = mockToastr.success.calls.mostRecent().returnValue;
      toastRef._hide();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', {});
    });
  });

  // ── ngModelChange ───────────────────────────────────────────────────────────

  describe('ngModelChange', () => {
    it('should NOT emit updateTXT immediately (debounced)', fakeAsync(() => {
      spyOn(TestBed.inject(Location), 'path').and.returnValue('/s_abc1234');
      fixture.detectChanges();
      mockSocket.emit.calls.reset();
      component.ngModelChange('new content');
      // Before debounce fires, no updateTXT should be emitted
      expect(mockSocket.emit).not.toHaveBeenCalledWith('updateTXT', jasmine.anything());
      discardPeriodicTasks();
    }));

    it('should emit updateTXT after 300ms debounce', fakeAsync(() => {
      spyOn(TestBed.inject(Location), 'path').and.returnValue('/s_abc1234');
      fixture.detectChanges();
      mockSocket.emit.calls.reset();
      component.ngModelChange('new content');
      tick(300);
      expect(mockSocket.emit).toHaveBeenCalledWith('updateTXT', {
        id: 's_abc1234',
        txt: 'new content',
      });
      discardPeriodicTasks();
    }));

    it('should debounce rapid successive calls, emitting only the last value', fakeAsync(() => {
      spyOn(TestBed.inject(Location), 'path').and.returnValue('/s_abc1234');
      fixture.detectChanges();
      mockSocket.emit.calls.reset();
      component.ngModelChange('a');
      tick(100);
      component.ngModelChange('ab');
      tick(100);
      component.ngModelChange('abc');
      tick(300);
      const calls = mockSocket.emit.calls.all().filter((c: any) => c.args[0] === 'updateTXT');
      expect(calls.length).toBe(1);
      expect(calls[0].args[1]).toEqual({ id: 's_abc1234', txt: 'abc' });
      discardPeriodicTasks();
    }));

    it('should emit updateTXT with empty id when at root', fakeAsync(() => {
      fixture.detectChanges();
      mockSocket.emit.calls.reset();
      component.ngModelChange('text');
      tick(300);
      expect(mockSocket.emit).toHaveBeenCalledWith('updateTXT', { id: '', txt: 'text' });
      discardPeriodicTasks();
    }));
  });

  // ── Tab key handling ────────────────────────────────────────────────────────

  describe('onTxtEditorKeydown (Tab)', () => {
    beforeEach(() => fixture.detectChanges());

    it('should insert tab character at cursor position', () => {
      const el = component['txtEditorTextarea'].nativeElement as HTMLTextAreaElement;
      el.value = 'hello world';
      el.selectionStart = 5;
      el.selectionEnd = 5;

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      component.onTxtEditorKeydown(event);

      expect(el.value).toBe('hello\t world');
    });

    it('should set cursor position after inserted tab', () => {
      const el = component['txtEditorTextarea'].nativeElement as HTMLTextAreaElement;
      el.value = 'abc';
      el.selectionStart = 2;
      el.selectionEnd = 2;

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      component.onTxtEditorKeydown(event);

      expect(el.selectionStart).toBe(3);
      expect(el.selectionEnd).toBe(3);
    });

    it('should prevent default behavior on Tab', () => {
      const el = component['txtEditorTextarea'].nativeElement as HTMLTextAreaElement;
      el.value = 'x';
      el.selectionStart = 1;
      el.selectionEnd = 1;

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      spyOn(event, 'preventDefault');
      component.onTxtEditorKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('should replace selected text with tab character', () => {
      const el = component['txtEditorTextarea'].nativeElement as HTMLTextAreaElement;
      el.value = 'hello world';
      el.selectionStart = 0;
      el.selectionEnd = 5;

      const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
      component.onTxtEditorKeydown(event);

      expect(el.value).toBe('\t world');
    });

    it('should not intercept non-Tab keys', () => {
      const el = component['txtEditorTextarea'].nativeElement as HTMLTextAreaElement;
      el.value = 'abc';
      el.selectionStart = 1;
      el.selectionEnd = 1;

      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      spyOn(event, 'preventDefault');
      component.onTxtEditorKeydown(event);

      expect(el.value).toBe('abc');
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  // ── line_counter ────────────────────────────────────────────────────────────

  describe('line_counter', () => {
    beforeEach(() => fixture.detectChanges());

    it('should generate "1." for a single line', () => {
      component['txtEditorTextarea'].nativeElement.value = 'one line';
      component.line_counter();
      expect(component.lineCounter).toBe('1.');
    });

    it('should generate numbered labels for multiple lines', () => {
      component['txtEditorTextarea'].nativeElement.value = 'a\nb\nc';
      component.line_counter();
      expect(component.lineCounter).toBe('1.\n2.\n3.');
    });

    it('should count empty lines', () => {
      component['txtEditorTextarea'].nativeElement.value = '\n\n';
      component.line_counter();
      expect(component.lineCounter).toBe('1.\n2.\n3.');
    });

    it('should not update lineCounter when count is unchanged', () => {
      component['txtEditorTextarea'].nativeElement.value = 'line1\nline2';
      component.line_counter();
      const before = component.lineCounter;
      component['txtEditorTextarea'].nativeElement.value = 'other\ncontent';
      component.line_counter();
      expect(component.lineCounter).toBe(before);
    });
  });

  // ── formatTime (via countdownTxt) ───────────────────────────────────────────

  describe('formatTime (private)', () => {
    const fmt = (s: number) => (component as any).formatTime(s);

    beforeEach(() => fixture.detectChanges());

    it('should format 0 seconds as 00:00', () => expect(fmt(0)).toBe('00:00'));
    it('should format 60 seconds as 01:00', () => expect(fmt(60)).toBe('01:00'));
    it('should format 90 seconds as 01:30', () => expect(fmt(90)).toBe('01:30'));
    it('should format 3599 seconds as 59:59', () => expect(fmt(3599)).toBe('59:59'));
    it('should format 3600 seconds as 60:00', () => expect(fmt(3600)).toBe('60:00'));
    it('should clamp negative seconds to 00:00', () => expect(fmt(-1)).toBe('00:00'));
    it('should clamp -100 seconds to 00:00', () => expect(fmt(-100)).toBe('00:00'));
  });

  // ── Countdown ───────────────────────────────────────────────────────────────

  describe('countdown', () => {
    beforeEach(() => fixture.detectChanges());

    it('should decrement every second', fakeAsync(() => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      tick(3000);
      expect(component['countdown']).toBe(3597);
      discardPeriodicTasks();
    }));

    it('should clear interval at zero', fakeAsync(() => {
      const data = { ...START_TXT_DATA(), validUntil: new Date(Date.now() + 2000).toISOString() };
      mockSocket.trigger('_startTXT', data);
      tick(3000);
      expect(component.countdownTxt).toBe('00:00');
      // No need to discard — interval already cleared
    }));

    it('should restart countdown when _updateTXT received', fakeAsync(() => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      tick(5000);
      const newValidUntil = new Date(Date.now() + 3_600_000).toISOString();
      mockSocket.trigger('_updateTXT', { txt: 'x', validUntil: newValidUntil });
      tick(1000);
      expect(component.countdownTxt).toBe('59:59');
      discardPeriodicTasks();
    }));

    it('should clamp countdown to 0 (never negative)', fakeAsync(() => {
      const data = { ...START_TXT_DATA(), validUntil: new Date(Date.now() + 1000).toISOString() };
      mockSocket.trigger('_startTXT', data);
      tick(5000); // let it run well past zero
      expect(component['countdown']).toBe(0);
      expect(component.countdownTxt).toBe('00:00');
    }));

    it('should set countdownTxt immediately on _startTXT without waiting for first tick', fakeAsync(() => {
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      // No tick — countdownTxt must be initialised synchronously in startCountDown
      expect(component.countdownTxt).toMatch(/^\d{2}:\d{2}$/);
      discardPeriodicTasks();
    }));

    it('should set countdownTxt immediately on _updateTXT without waiting for first tick', fakeAsync(() => {
      mockSocket.trigger('_updateTXT', { txt: 'x', validUntil: new Date(Date.now() + 1800000).toISOString() });
      // No tick — countdownTxt must reflect the new countdown immediately
      expect(component.countdownTxt).toBe('30:00');
      discardPeriodicTasks();
    }));

    it('should use 3600s fallback when validUntil is invalid (NaN)', fakeAsync(() => {
      mockSocket.trigger('_startTXT', { ...START_TXT_DATA(), validUntil: 'not-a-date' });
      expect(component['countdown']).toBe(3600);
      discardPeriodicTasks();
    }));

    it('should use 3600s fallback when validUntil is undefined', fakeAsync(() => {
      mockSocket.trigger('_startTXT', { ...START_TXT_DATA(), validUntil: undefined });
      expect(component['countdown']).toBe(3600);
      discardPeriodicTasks();
    }));
  });

  // ── Scroll sync ─────────────────────────────────────────────────────────────

  describe('onTxtEditorScroll', () => {
    it('should sync scrollTop from editor to line counter', () => {
      fixture.detectChanges();
      const editor = component['txtEditorTextarea'].nativeElement;
      const counter = component['lineCounterTextarea'].nativeElement;

      Object.defineProperty(editor, 'scrollTop',  { value: 200, writable: true, configurable: true });
      Object.defineProperty(editor, 'scrollLeft', { value: 40,  writable: true, configurable: true });

      // Intercept the DOM setter on the counter element (DOM ignores scrollTop if not scrollable)
      let capturedScrollTop = 0;
      let capturedScrollLeft = 0;
      Object.defineProperty(counter, 'scrollTop',  { get: () => capturedScrollTop,  set: (v: number) => { capturedScrollTop  = v; }, configurable: true });
      Object.defineProperty(counter, 'scrollLeft', { get: () => capturedScrollLeft, set: (v: number) => { capturedScrollLeft = v; }, configurable: true });

      component.onTxtEditorScroll();

      expect(capturedScrollTop).toBe(200);
      expect(capturedScrollLeft).toBe(40);
    });
  });

  // ── ngOnDestroy ─────────────────────────────────────────────────────────────

  describe('ngOnDestroy', () => {
    it('should clear countdown interval', fakeAsync(() => {
      fixture.detectChanges();
      mockSocket.trigger('_startTXT', START_TXT_DATA());
      tick(1000);
      component.ngOnDestroy();
      const countBefore = component['countdown'];
      tick(5000);
      expect(component['countdown']).toBe(countBefore);
    }));

    it('should complete destroy$ subject', () => {
      fixture.detectChanges();
      const destroy$ = component['destroy$'];
      let completed = false;
      destroy$.subscribe({ complete: () => (completed = true) });
      component.ngOnDestroy();
      expect(completed).toBeTrue();
    });

    it('should stop reacting to socket events after destroy', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      mockSocket.trigger('_updateTXT', { txt: 'after destroy', validUntil: VALID_UNTIL_1H() });
      expect(component.txtEditor).not.toBe('after destroy');
    });
  });
});
