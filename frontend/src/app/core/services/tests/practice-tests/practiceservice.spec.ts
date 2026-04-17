import { TestBed } from '@angular/core/testing';

import { Practiceservice } from './practiceservice';

describe('Practiceservice', () => {
  let service: Practiceservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Practiceservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
