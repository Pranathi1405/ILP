// ── Backend response shapes ───────────────────────────────────────────────────

/** Row returned by GET /doubts/my-doubts */
export interface DoubtResponse {
  doubt_id: number;
  question_text: string;
  status: 'open' | 'resolved';
  created_at: string;
  course_id: number;
  course_name: string;
  subject_id: number;
  subject_name: string;
}

export interface CourseResponse {
  course_id: number;
  course_name: string;
}

export interface SubjectResponse {
  subject_id: number;
  subject_name: string;
}

export interface DoubtDetailAttachment {
  attachmentId: number;
  fileType: string;
  fileUrl: string;
  fileName: string;
  fileSizeKb: number;
}

export interface DoubtDetailReply {
  replyId: number;
  replyText: string;
  responderType: 'student' | 'teacher';
  createdAt: string;
  responder: {
    id: number;
    name: string;
    avatar: string | null;
  };
  attachments: DoubtDetailAttachment[];
}

/** Shape returned by GET /doubts/:doubtId — inside .data */
export interface DoubtDetailResponse {
  doubtId: number;
  questionText: string;
  status: 'open' | 'resolved';
  createdAt: string;
  student: {
    id: number;
    name: string;
    attachments: DoubtDetailAttachment[];
  };
  teacher: {
    id: number;
    name: string;
  };
  replies: DoubtDetailReply[];
}

/** Backend pagination — hasNextPage is computed client-side */
export interface BackendPagination {
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
  totalPages?: number;
}

// ── Frontend models ───────────────────────────────────────────────────────────
export type DoubtStatus = 'OPEN' | 'RESOLVED';

export interface Doubt {
  doubt_id: number;
  question: string;
  status: DoubtStatus;
  created_at: string;
  course_id: number;
  course_name: string;
  subject_id: number;
  subject_name: string;
}

export interface Course {
  course_id: number;
  course_name: string;
}

export interface Subject {
  subject_id: number;
  subject_name: string;
}

export interface DoubtDetail {
  doubtId: number;
  questionText: string;
  status: DoubtStatus;
  createdAt: string;
  student: {
    id: number;
    name: string;
    attachments: DoubtDetailAttachment[];
  };
  teacher: {
    id: number;
    name: string;
  };
  replies: DoubtDetailReply[];
}

export interface DoubtFilters {
  status?: 'open' | 'resolved'; // undefined = All
  courseId?: number;
  subjectId?: number;
  keyword?: string; // ← backend uses 'keyword', not 'search'
  page?: number;
  limit?: number;
}

export interface DoubtPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean; // computed client-side: page < totalPages
}

// ── Mappers ───────────────────────────────────────────────────────────────────
export function mapDoubt(r: DoubtResponse): Doubt {
  return {
    doubt_id: r.doubt_id,
    question: r.question_text,
    status: r.status.toUpperCase() as DoubtStatus,
    created_at: r.created_at,
    course_id: r.course_id,
    course_name: r.course_name,
    subject_id: r.subject_id,
    subject_name: r.subject_name,
  };
}

export function mapCourse(r: CourseResponse): Course {
  return { course_id: r.course_id, course_name: r.course_name };
}

export function mapSubject(r: SubjectResponse): Subject {
  return { subject_id: r.subject_id, subject_name: r.subject_name };
}

export function mapDoubtDetail(r: DoubtDetailResponse): DoubtDetail {
  return {
    doubtId: r.doubtId,
    questionText: r.questionText,
    status: r.status.toUpperCase() as DoubtStatus,
    createdAt: r.createdAt,
    student: r.student,
    teacher: r.teacher,
    replies: r.replies,
  };
}

export function computePagination(p: BackendPagination): DoubtPagination {
  const totalPages = p.totalPages ?? p.total_pages ?? Math.max(1, Math.ceil(p.total / p.limit));

  return {
    total: p.total,
    page: p.page,
    limit: p.limit,
    totalPages,
    hasNextPage: p.page < totalPages,
  };
}
