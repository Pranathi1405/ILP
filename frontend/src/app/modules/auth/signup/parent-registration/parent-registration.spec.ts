import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentRegistrationComponent } from './parent-registration';

describe('ParentRegistrationComponent', () => {
  let component: ParentRegistrationComponent;
  let fixture: ComponentFixture<ParentRegistrationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentRegistrationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ParentRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
