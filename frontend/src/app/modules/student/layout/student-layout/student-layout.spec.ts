import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentLayoutComponent } from './student-layout';

describe('StudentLayout', () => {
  let component: StudentLayoutComponent;
  let fixture: ComponentFixture<StudentLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
