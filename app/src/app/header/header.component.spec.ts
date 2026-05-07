import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Socket } from 'ngx-socket-io';
import { HeaderComponent } from './header.component';

// ─── Mocks ────────────────────────────────────────────────────────────────────

class MockSocket {
  emit = jasmine.createSpy('emit');
}

class MockNgbModal {
  open = jasmine.createSpy('open').and.returnValue({ result: Promise.resolve('closed') });
}

class MockLocation {
  path = jasmine.createSpy('path').and.returnValue('/s_abc1234');
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let mockSocket: MockSocket;
  let mockModal: MockNgbModal;
  let mockLocation: MockLocation;

  beforeEach(async () => {
    mockSocket   = new MockSocket();
    mockModal    = new MockNgbModal();
    mockLocation = new MockLocation();

    await TestBed.configureTestingModule({
      declarations: [HeaderComponent],
      providers: [
        { provide: Socket,    useValue: mockSocket },
        { provide: NgbModal,  useValue: mockModal },
        { provide: Location,  useValue: mockLocation },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    component.txtEditor   = '';
    component.countdownTxt = '59:00';
    fixture.detectChanges();
  });

  // ── Creation ─────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Input bindings ───────────────────────────────────────────────────────────

  describe('input: countdownTxt', () => {
    it('should render countdown in the renew button', () => {
      component.countdownTxt = '42:15';
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('[title="Renew TXT Time"]'));
      expect(btn.nativeElement.textContent).toContain('42:15');
    });

    it('should render fallback 00:00 when countdownTxt is falsy', () => {
      component.countdownTxt = '';
      fixture.detectChanges();
      const btn = fixture.debugElement.query(By.css('[title="Renew TXT Time"]'));
      expect(btn.nativeElement.textContent).toContain('00:00');
    });
  });

  // ── Presence of buttons ──────────────────────────────────────────────────────

  describe('template: buttons', () => {
    it('should render the New button', () => {
      const btn = fixture.debugElement.query(By.css('[title="New TXT"]'));
      expect(btn).toBeTruthy();
    });

    it('should render the Download button', () => {
      const btn = fixture.debugElement.query(By.css('[title="Download TXT"]'));
      expect(btn).toBeTruthy();
    });

    it('should render the Share button', () => {
      const btn = fixture.debugElement.query(By.css('[title="Share TXT"]'));
      expect(btn).toBeTruthy();
    });

    it('should render the Renew button', () => {
      const btn = fixture.debugElement.query(By.css('[title="Renew TXT Time"]'));
      expect(btn).toBeTruthy();
    });

    it('should render the Delete button', () => {
      const btn = fixture.debugElement.query(By.css('[title="Delete TXT"]'));
      expect(btn).toBeTruthy();
    });

    it('should render the TXT Share brand link', () => {
      const brand = fixture.debugElement.query(By.css('.navbar-brand'));
      expect(brand.nativeElement.textContent.trim()).toBe('TXT Share');
    });
  });

  // ── Method: newTxt ───────────────────────────────────────────────────────────

  describe('newTxt()', () => {
    it('should emit startTXT with no id', () => {
      component.newTxt();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', {});
    });

    it('should emit startTXT when New button is clicked', () => {
      const btn = fixture.debugElement.query(By.css('[title="New TXT"]'));
      btn.nativeElement.click();
      expect(mockSocket.emit).toHaveBeenCalledWith('startTXT', {});
    });
  });

  // ── Method: downloadTXT ──────────────────────────────────────────────────────

  describe('downloadTXT()', () => {
    it('should create an anchor element and click it', () => {
      const anchor = document.createElement('a');
      spyOn(document, 'createElement').and.returnValue(anchor);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(anchor, 'click');

      component.txtEditor = 'file content';
      component.downloadTXT();

      expect(anchor.click).toHaveBeenCalled();
      expect(anchor.download).toBe('s_abc1234.txt');
    });

    it('should use current session id as filename', () => {
      mockLocation.path.and.returnValue('/s_xyz9876');
      const anchor = document.createElement('a');
      spyOn(document, 'createElement').and.returnValue(anchor);
      spyOn(document.body, 'appendChild');
      spyOn(document.body, 'removeChild');
      spyOn(anchor, 'click');

      component.downloadTXT();

      expect(anchor.download).toBe('s_xyz9876.txt');
    });
  });

  // ── Method: deleteTXT ────────────────────────────────────────────────────────

  describe('deleteTXT()', () => {
    it('should emit deleteTXT with current session id', () => {
      component.deleteTXT();
      expect(mockSocket.emit).toHaveBeenCalledWith('deleteTXT', { id: 's_abc1234' });
    });

    it('should emit deleteTXT when Delete button is clicked', () => {
      const btn = fixture.debugElement.query(By.css('[title="Delete TXT"]'));
      btn.nativeElement.click();
      expect(mockSocket.emit).toHaveBeenCalledWith('deleteTXT', { id: 's_abc1234' });
    });
  });

  // ── Method: renewTXT ─────────────────────────────────────────────────────────

  describe('renewTXT()', () => {
    it('should emit renewTXT with current session id', () => {
      component.renewTXT();
      expect(mockSocket.emit).toHaveBeenCalledWith('renewTXT', { id: 's_abc1234' });
    });

    it('should emit renewTXT when Renew button is clicked', () => {
      const btn = fixture.debugElement.query(By.css('[title="Renew TXT Time"]'));
      btn.nativeElement.click();
      expect(mockSocket.emit).toHaveBeenCalledWith('renewTXT', { id: 's_abc1234' });
    });
  });

  // ── Method: openModal ────────────────────────────────────────────────────────

  describe('openModal()', () => {
    it('should call NgbModal.open with the given content', () => {
      const fakeContent = {} as any;
      component.openModal(fakeContent);
      expect(mockModal.open).toHaveBeenCalledWith(fakeContent, { ariaLabelledBy: 'modal-basic-title' });
    });

    it('should open modal when Share button is clicked', () => {
      fixture.debugElement.query(By.css('[title="Share TXT"]')).nativeElement.click();
      expect(mockModal.open).toHaveBeenCalled();
    });
  });
});
