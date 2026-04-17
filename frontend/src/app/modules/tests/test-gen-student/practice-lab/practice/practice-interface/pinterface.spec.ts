import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pinterface } from './pinterface';

describe('Pinterface', () => {
  let component: Pinterface;
  let fixture: ComponentFixture<Pinterface>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pinterface]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pinterface);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
