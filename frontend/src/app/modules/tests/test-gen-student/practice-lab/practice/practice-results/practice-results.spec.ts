import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PracticeResults } from './practice-results';

describe('PracticeResults', () => {
  let component: PracticeResults;
  let fixture: ComponentFixture<PracticeResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PracticeResults]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PracticeResults);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
