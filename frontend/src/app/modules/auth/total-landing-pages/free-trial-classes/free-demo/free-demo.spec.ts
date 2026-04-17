import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreeDemo } from './free-demo';

describe('FreeDemo', () => {
  let component: FreeDemo;
  let fixture: ComponentFixture<FreeDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreeDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FreeDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
