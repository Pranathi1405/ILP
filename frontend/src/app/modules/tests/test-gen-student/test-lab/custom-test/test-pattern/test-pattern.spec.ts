import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestPattern } from './test-pattern';

describe('TestPattern', () => {
  let component: TestPattern;
  let fixture: ComponentFixture<TestPattern>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestPattern]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestPattern);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
