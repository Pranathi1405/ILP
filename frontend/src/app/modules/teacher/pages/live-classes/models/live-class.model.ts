// Author: Poojitha

export type LiveClassUserRole = 'teacher' | 'student';

export interface LiveClass {
  id: string;
  title: string;
  course: string;
  subject: string;
  module: string;

  course_name?: string;
  subject_name?: string;
  module_name?: string;

  date: string;
  time: string;

  status: 'live' | 'scheduled' | 'completed';

  room_id?: string;
  description?: string | null;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  meeting_id?: string | null;
  meeting_link?: string | null;
}
export interface BroadcastTokenResponse {
  app_id: number;
  token: string;
  room_id: string;
  user_id: string;
  user_name: string;
  role: 'Host' | 'Audience';
  class_id: number;
}


