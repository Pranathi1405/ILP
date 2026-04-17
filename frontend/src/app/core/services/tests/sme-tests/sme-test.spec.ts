import { TestBed } from '@angular/core/testing';

import { SmeTestService } from './sme-test';

describe('SmeTest', () => {
  let service: SmeTestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SmeTestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
