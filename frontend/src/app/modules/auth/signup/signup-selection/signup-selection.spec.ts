import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupSelection } from './signup-selection';

describe('SignupSelection', () => {
  let component: SignupSelection;
  let fixture: ComponentFixture<SignupSelection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupSelection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SignupSelection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
