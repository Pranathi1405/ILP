import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Termsandconditions } from './termsandconditions';

describe('Termsandconditions', () => {
  let component: Termsandconditions;
  let fixture: ComponentFixture<Termsandconditions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Termsandconditions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Termsandconditions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
