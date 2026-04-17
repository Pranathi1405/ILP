import { TestBed } from '@angular/core/testing';

import { CustomTest } from './custom-test';

describe('CustomTest', () => {
  let service: CustomTest;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomTest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
