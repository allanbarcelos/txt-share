import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { InfoModalComponent } from './info-modal.component';

describe('InfoModalComponent', () => {
  let component: InfoModalComponent;
  let fixture: ComponentFixture<InfoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InfoModalComponent],
    }).compileComponents();

    fixture   = TestBed.createComponent(InfoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('template', () => {
    it('should display "About TXT Share" in card header', () => {
      const header = fixture.debugElement.query(By.css('.card-header'));
      expect(header.nativeElement.textContent).toContain('About TXT Share');
    });

    it('should mention TXT Share in the description body', () => {
      const body = fixture.debugElement.query(By.css('.card-body'));
      expect(body.nativeElement.textContent).toContain('TXT Share');
    });

    it('should include a GitHub link', () => {
      const links = fixture.debugElement.queryAll(By.css('a'));
      const github = links.find(el =>
        (el.nativeElement as HTMLAnchorElement).href.includes('github.com')
      );
      expect(github).toBeTruthy();
    });

    it('should include a Buy Me a Coffee link', () => {
      const links = fixture.debugElement.queryAll(By.css('a'));
      const coffee = links.find(el =>
        (el.nativeElement as HTMLAnchorElement).href.includes('buymeacoffee.com')
      );
      expect(coffee).toBeTruthy();
    });
  });
});
