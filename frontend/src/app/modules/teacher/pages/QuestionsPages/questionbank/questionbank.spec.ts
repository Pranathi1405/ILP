import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Questionbank } from './questionbank';

describe('Questionbank', () => {
  let component: Questionbank;
  let fixture: ComponentFixture<Questionbank>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Questionbank]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Questionbank);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
