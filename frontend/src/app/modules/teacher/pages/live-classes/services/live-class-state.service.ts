// Author: Poojitha
// Live-Class State Management Service

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LiveClassStateService {

  private sessionData = new BehaviorSubject<any>({
    title: '',
    course: '',
    course_name: '',
    subject: '',
    subject_name: '',
    module: '',
    module_name: '',
    date: '',
    time: '',
    duration: '',
    settings: {
      chat: true,
      record: true,
      handRaise: false,
      polls: false
    }
  });

  sessionData$ = this.sessionData.asObservable();

  // update session data
  updateSession(data: any) {
    const current = this.sessionData.getValue();

    this.sessionData.next({
      ...current,
      ...data,
      settings: {
        ...current.settings,
        ...(data.settings || {}) 
      }
    });
  }
}
