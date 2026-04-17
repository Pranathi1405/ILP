import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Pinstructions } from './pinstructions';

describe('Pinstructions', () => {
  let component: Pinstructions;
  let fixture: ComponentFixture<Pinstructions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pinstructions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pinstructions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
