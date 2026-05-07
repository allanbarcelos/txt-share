import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FooterComponent],
    }).compileComponents();

    fixture   = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('should display "TXT Share" text in footer', () => {
      const footer = fixture.debugElement.query(By.css('footer'));
      expect(footer.nativeElement.textContent).toContain('TXT Share');
    });

    it('should have a GitHub source code link', () => {
      const links = fixture.debugElement.queryAll(By.css('a'));
      const github = links.find(el =>
        (el.nativeElement as HTMLAnchorElement).href.includes('github.com')
      );
      expect(github).toBeTruthy();
    });

    it('should open GitHub link in a new tab', () => {
      const links = fixture.debugElement.queryAll(By.css('a'));
      const github = links.find(el =>
        (el.nativeElement as HTMLAnchorElement).href.includes('github.com')
      );
      expect(github?.nativeElement.target).toBe('_blank');
    });

    it('should have a Buy Me a Coffee link', () => {
      const links = fixture.debugElement.queryAll(By.css('a'));
      const coffee = links.find(el =>
        (el.nativeElement as HTMLAnchorElement).href.includes('buymeacoffee.com')
      );
      expect(coffee).toBeTruthy();
    });

    it('should display the coffee button image', () => {
      const img = fixture.debugElement.query(By.css('img[alt="Buy Me A Coffee"]'));
      expect(img).toBeTruthy();
    });
  });
});
