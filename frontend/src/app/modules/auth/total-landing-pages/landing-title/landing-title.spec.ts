import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LandingTitleComponent } from './landing-title';

describe('LandingTitleComponent', () => {
  let component: LandingTitleComponent;
  let fixture: ComponentFixture<LandingTitleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingTitleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingTitleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
