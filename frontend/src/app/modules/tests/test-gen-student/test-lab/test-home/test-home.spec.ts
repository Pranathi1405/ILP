import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestHome } from './test-home';

describe('TestHome', () => {
  let component: TestHome;
  let fixture: ComponentFixture<TestHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestHome);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
