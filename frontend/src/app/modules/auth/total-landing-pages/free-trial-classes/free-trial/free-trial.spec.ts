import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeTrialComponent } from './free-trial';

describe('FreeTrialComponent', () => {
  let component: FreeTrialComponent;
  let fixture: ComponentFixture<FreeTrialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreeTrialComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeTrialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
