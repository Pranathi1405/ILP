import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherRegistration } from './teacher-registration';

describe('TeacherRegistration', () => {
  let component: TeacherRegistration;
  let fixture: ComponentFixture<TeacherRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeacherRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
