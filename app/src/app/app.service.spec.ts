import { TestBed } from '@angular/core/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should be injectable as a singleton', () => {
    const second = TestBed.inject(AppService);
    expect(service).toBe(second);
  });
});
