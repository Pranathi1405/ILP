import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailedResults } from './detailed-results';

describe('DetailedResults', () => {
  let component: DetailedResults;
  let fixture: ComponentFixture<DetailedResults>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailedResults]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailedResults);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
