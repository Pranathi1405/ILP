import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherLayoutComponent } from './teacher-layout';

describe('TeacherLayout', () => {
  let component: TeacherLayoutComponent;
  let fixture: ComponentFixture<TeacherLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
