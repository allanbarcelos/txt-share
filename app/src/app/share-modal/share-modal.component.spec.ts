import { Clipboard } from '@angular/cdk/clipboard';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ShareModalComponent } from './share-modal.component';

// ─── Mocks ────────────────────────────────────────────────────────────────────

class MockClipboard {
  copy = jasmine.createSpy('copy').and.returnValue(true);
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ShareModalComponent', () => {
  let component: ShareModalComponent;
  let fixture: ComponentFixture<ShareModalComponent>;
  let mockClipboard: MockClipboard;

  beforeEach(async () => {
    mockClipboard = new MockClipboard();

    await TestBed.configureTestingModule({
      declarations: [ShareModalComponent],
      providers: [
        { provide: Clipboard, useValue: mockClipboard },
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

  // ── url getter ───────────────────────────────────────────────────────────────

  describe('url getter', () => {
    it('should return window.location.href', () => {
      expect(component.url).toBe(window.location.href);
    });

    it('should render the url in the readonly input via [value] binding', () => {
      fixture.detectChanges();
      const input = fixture.debugElement.query(By.css('input.form-control'));
      expect((input.nativeElement as HTMLInputElement).value).toBe(window.location.href);
    });

    it('input should use [value] binding (not ngModel)', () => {
      const input = fixture.debugElement.query(By.css('input.form-control'));
      expect(input.nativeElement.hasAttribute('readonly')).toBeTrue();
    });
  });

  // ── encodedUrl getter ────────────────────────────────────────────────────────

  describe('encodedUrl getter', () => {
    it('should return URL-encoded version of url', () => {
      expect(component.encodedUrl).toBe(encodeURIComponent(window.location.href));
    });

    it('should encode special characters (e.g. colon, slash)', () => {
      expect(component.encodedUrl).not.toContain('//');
      expect(component.encodedUrl).not.toContain(':');
    });

    it('Telegram link should contain encodedUrl', () => {
      fixture.detectChanges();
      const link = fixture.debugElement.queryAll(By.css('a')).find(el =>
        el.nativeElement.textContent.includes('Telegram')
      );
      expect(link!.nativeElement.href).toContain(component.encodedUrl);
    });

    it('Teams link should contain encodedUrl', () => {
      fixture.detectChanges();
      const link = fixture.debugElement.queryAll(By.css('a')).find(el =>
        el.nativeElement.textContent.includes('Teams')
      );
      expect(link!.nativeElement.href).toContain(component.encodedUrl);
    });
  });

  // ── copyToClipboard ──────────────────────────────────────────────────────────

  describe('copyToClipboard()', () => {
    it('should copy window.location.href (full URL)', () => {
      component.copyToClipboard();
      expect(mockClipboard.copy).toHaveBeenCalledWith(window.location.href);
    });

    it('should call clipboard.copy when copy button is clicked', () => {
      fixture.debugElement.query(By.css('button.btn-outline-secondary')).nativeElement.click();
      expect(mockClipboard.copy).toHaveBeenCalledWith(window.location.href);
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
