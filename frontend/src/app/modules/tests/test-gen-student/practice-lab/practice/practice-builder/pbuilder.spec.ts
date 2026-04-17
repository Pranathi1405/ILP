import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';

import { Pbuilder } from './pbuilder';
import { PracticeService } from '../../../../../../core/services/tests/practice-tests/practiceservice';
import { StudentCourseService } from '../../../../../../core/services/student/student-course.service';

describe('Pbuilder', () => {
  let component: Pbuilder;
  let fixture: ComponentFixture<Pbuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pbuilder],
      providers: [
        {
          provide: PracticeService,
          useValue: {
            createTest: jasmine.createSpy('createTest'),
          },
        },
        {
          provide: StudentCourseService,
          useValue: {
            getEnrolledCourses: jasmine
              .createSpy('getEnrolledCourses')
              .and.returnValue(of({ success: true, message: 'ok', data: [] })),
            getSubjectsByCourse: jasmine
              .createSpy('getSubjectsByCourse')
              .and.returnValue(of({ success: true, message: 'ok', data: [] })),
            getModulesBySubject: jasmine
              .createSpy('getModulesBySubject')
              .and.returnValue(of({ success: true, message: 'ok', data: [] })),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pbuilder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
