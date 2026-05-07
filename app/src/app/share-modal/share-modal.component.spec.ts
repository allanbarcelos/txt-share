import { Clipboard } from '@angular/cdk/clipboard';
import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ShareModalComponent } from './share-modal.component';

// ─── Mocks ────────────────────────────────────────────────────────────────────

class MockClipboard {
  copy = jasmine.createSpy('copy').and.returnValue(true);
}

class MockLocation {
  path = jasmine.createSpy('path').and.returnValue('/s_abc1234');
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ShareModalComponent', () => {
  let component: ShareModalComponent;
  let fixture: ComponentFixture<ShareModalComponent>;
  let mockClipboard: MockClipboard;
  let mockLocation: MockLocation;

  beforeEach(async () => {
    mockClipboard = new MockClipboard();
    mockLocation  = new MockLocation();

    await TestBed.configureTestingModule({
      declarations: [ShareModalComponent],
      imports: [FormsModule],
      providers: [
        { provide: Clipboard, useValue: mockClipboard },
        { provide: Location,  useValue: mockLocation },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(ShareModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Creation ─────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── URL initialization ───────────────────────────────────────────────────────

  describe('url property', () => {
    it('should set url from window.location.href', () => {
      expect(component.url).toBe(window.location.href);
    });

    it('should render url in the readonly input', () => {
      component.url = 'http://localhost/s_abc1234';
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.css('input.form-control'));
      expect((input.nativeElement as HTMLInputElement).value).toBe('http://localhost/s_abc1234');
    });
  });

  // ── copyToClipboard ──────────────────────────────────────────────────────────

  describe('copyToClipboard()', () => {
    it('should copy the session id extracted from location path', () => {
      component.copyToClipboard();
      expect(mockClipboard.copy).toHaveBeenCalledWith('s_abc1234');
    });

    it('should strip leading slash from path', () => {
      mockLocation.path.and.returnValue('/s_xyz9999');
      component.copyToClipboard();
      expect(mockClipboard.copy).toHaveBeenCalledWith('s_xyz9999');
    });

    it('should call clipboard.copy when copy button is clicked', () => {
      fixture.debugElement.query(By.css('button.btn-outline-secondary')).nativeElement.click();
      expect(mockClipboard.copy).toHaveBeenCalled();
    });
  });

  // ── Template content ─────────────────────────────────────────────────────────

  describe('template', () => {
    it('should display "Share TXT Share" in card header', () => {
      const header = fixture.debugElement.query(By.css('.card-header'));
      expect(header.nativeElement.textContent).toContain('Share TXT Share');
    });

    it('should show a WhatsApp share link', () => {
      const link = fixture.debugElement.queryAll(By.css('a')).find(el =>
        el.nativeElement.textContent.includes('Whatsapp')
      );
      expect(link).toBeTruthy();
    });

    it('should show a Telegram share link', () => {
      const link = fixture.debugElement.queryAll(By.css('a')).find(el =>
        el.nativeElement.textContent.includes('Telegram')
      );
      expect(link).toBeTruthy();
    });

    it('should show a Teams share link', () => {
      const link = fixture.debugElement.queryAll(By.css('a')).find(el =>
        el.nativeElement.textContent.includes('Teams')
      );
      expect(link).toBeTruthy();
    });
  });
});
