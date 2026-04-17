import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, timeout, switchMap } from 'rxjs/operators';
import { ApiService } from '../api.service';
import {
  LinkedStudent,
  ParentDashboard,
  SubjectBar,
  ExamResultRow,
  PerformanceTrendPoint,
  ParentPerformanceViewModel,
  ScoreTrendAttempt,
  TopicMasteryItem,
} from './parent-performance.data';

@Injectable({ providedIn: 'root' })
export class ParentPerformanceService {
  private api = inject(ApiService);

  // subject_id → label mapping (backend returns null for subject_title)
  private readonly subjectLabels: Record<number, string> = {
    5: 'Mathematics',
    6: 'Physics',
    7: 'Chemistry',
    8: 'Biology',
  };

  getPerformanceViewModel(): Observable<ParentPerformanceViewModel> {
    return this.api.get<any>('analytics/parent/students').pipe(
      timeout(8000),
      map((res) => {
        const students: LinkedStudent[] = res?.data?.students ?? [];
        return students.find((s) => s.is_primary) ?? students[0] ?? null;
      }),
      catchError((err) => {
        console.error('Parent students API failed:', err);
        return of(null);
      }),

      switchMap((student: LinkedStudent | null) => {
        if (!student) {
          console.error('No linked student found');
          return of(null);
        }
        return forkJoin({
          student: of(student),
          dashboard: this.api
            .get<any>(`analytics/parent/dashboard?studentId=${student.student_id}`)
            .pipe(
              timeout(8000),
              map((res) => res?.data ?? null),
              catchError((err) => {
                console.error('Parent dashboard API failed:', err);
                return of(null);
              }),
            ),
        });
      }),

      map((result: any): ParentPerformanceViewModel => {
        if (!result) throw new Error('No data');

        const student = result.student as LinkedStudent;
        const dashboard = result.dashboard as ParentDashboard | null;

        // ── Helper: calculate score percent from score + max_score ──
        const calcPercent = (score: any, maxScore: any): number => {
          const s = parseFloat(score ?? '0') || 0;
          const m = parseFloat(maxScore ?? '0') || 0;
          if (m === 0) return 0;
          return Math.max(0, Math.round((s / m) * 100)); // clamp negatives to 0
        };

        // ── Subject proficiency from all_topics ──
        // subject_title is null in DB → fall back to subject_id label map
        const allTopics: any[] = dashboard?.topic_mastery?.all_topics ?? [];
        const subjectMap = new Map<string, number[]>();

        allTopics.forEach((t: any) => {
          const subject =
            (t.subject_title as string | null) ??
            this.subjectLabels[t.subject_id as number] ??
            `Subject ${t.subject_id}`;
          const score = parseFloat(t.avg_score ?? '0') || 0;
          if (!subjectMap.has(subject)) subjectMap.set(subject, []);
          subjectMap.get(subject)!.push(score);
        });

        const subjectBars: SubjectBar[] = Array.from(subjectMap.entries()).map(
          ([subject_title, scores]) => {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            return {
              subject_title,
              avg_score: Math.round(avg),
              bar_color_class: this.getBarColorClass(avg),
              score_color_class: this.getScoreColorClass(avg),
            };
          },
        );

        // ── Topic mastery ──
        // topic_name is null in DB → fall back to module_id label
        const resolveTopicName = (t: any): string =>
          (t.topic_name as string | null) ?? `Module ${t.module_id}`;

        const grouped = dashboard?.topic_mastery?.grouped as any;
        const strongTopics: string[] = (grouped?.STRONG ?? []).map(resolveTopicName);
        const weakTopics: string[] = (grouped?.WEAK ?? []).map(resolveTopicName);

        // ── Score trend attempts ──
        // score_percent is NOT in the API — calculate from score / max_score
        const attempts: any[] = dashboard?.score_trend?.attempts ?? [];

        // ── Trend badge ──
        let trendBadge = '';
        let trendPositive = true;
        if (attempts.length >= 2) {
          const first = calcPercent(attempts[0].score, attempts[0].max_score);
          const last = calcPercent(
            attempts[attempts.length - 1].score,
            attempts[attempts.length - 1].max_score,
          );
          const diff = last - first;
          trendPositive = diff >= 0;
          trendBadge = `${diff >= 0 ? '+' : ''}${diff}% ${diff >= 0 ? 'Increase' : 'Decrease'}`;
        }

        // ── Exam results ──
        const examResults: ExamResultRow[] = attempts.map((a: any): ExamResultRow => {
          const pct = calcPercent(a.score, a.max_score);
          return {
            date: this.formatDate(a.attempted_at ?? ''),
            test_name: a.test_name ?? 'Unknown Test',
            score: `${parseFloat(a.score ?? '0').toFixed(0)}/${a.max_score ?? 0}`,
            score_percent: pct,
            accuracy_color_class: this.getScoreColorClass(pct),
            trend_direction: a.trend_direction ?? '',
          };
        });

        // ── Trend points for chart ──
        const trendPoints: PerformanceTrendPoint[] = attempts.map(
          (a: any, i: number): PerformanceTrendPoint => ({
            label: `T${i + 1}`,
            score_percent: calcPercent(a.score, a.max_score),
            test_name: a.test_name ?? '',
            attempted_at: a.attempted_at ?? '',
          }),
        );

        return {
          childName: `${student.first_name} ${student.last_name}`.trim(),
          studentId: student.student_id,
          performanceTrend: dashboard?.analytics?.performance_trend ?? 'stable',
          trendBadge,
          trendPositive,
          subjectBars,
          strongTopics,
          weakTopics,
          examResults,
          trendPoints,
        };
      }),

      catchError((err) => {
        console.error('ViewModel build failed:', err);
        throw err;
      }),
    );
  }

  private getBarColorClass(score: number): string {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-orange-400';
    return 'bg-red-500';
  }

  private getScoreColorClass(score: number): string {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-500';
  }

  private formatDate(iso: string): string {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
