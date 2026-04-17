import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewanalysis } from './viewanalysis';

describe('Viewanalysis', () => {
  let component: Viewanalysis;
  let fixture: ComponentFixture<Viewanalysis>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Viewanalysis]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Viewanalysis);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
