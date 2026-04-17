// <!-- Author: Poojitha -->
//  <!-- Teacher side live class Streaming Page -->

import { Component, OnInit, OnDestroy, ElementRef, ViewChild, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { LiveClassService } from '../../../../../../core/services/liveClasses/live-class.service';
import { ZegoLiveKitService } from '../../../../../../shared/services/zego-live-kit.service';

@Component({
  selector: 'app-live-session',
  standalone: true,
  templateUrl: './live-session.html',
})
export class LiveSession implements OnInit, OnDestroy {

  @ViewChild('zegoContainer', { static: true })
  zegoContainer!: ElementRef;

  private route = inject(ActivatedRoute);
  private leaveRequestStarted = false;
  isLoading = true;
  errorMessage = '';

  private zegoService = inject(ZegoLiveKitService);

  constructor(
    private router: Router,
    private liveClassService: LiveClassService
  ) { }

  ngOnInit(): void {
    const classId = this.route.snapshot.paramMap.get('id');

    if (!classId) {
      this.errorMessage = 'Invalid class ID';
      this.router.navigate(['/teacher/live-studio']);
      return;
    }

    // Get broadcast token and join ZEGO room
    this.liveClassService.getBroadcastToken(classId).subscribe({
      next: (session: any) => {
        console.log('Token received', session);

        this.zegoService.joinRoom(
          this.zegoContainer.nativeElement,
          Number(classId),
          session,
          () => {
            if (this.leaveRequestStarted) {
              return;
            }
            this.leaveRequestStarted = true;

            this.liveClassService.endClass(classId).subscribe({
              next: () => {
                console.log('Class ended');
                setTimeout(() => {
                  this.zegoService.destroyRoom();
                  this.router.navigate(['/teacher/live-studio']);
                }, 300); // Delay to ensure room is destroyed before navigating away

              },
              error: (err) => {
                console.error('End class error:', err);
                this.router.navigate(['/teacher/live-studio']);
              }
            });
          }
        );

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Token fetch error:', err);
        this.errorMessage = 'Unable to start live session';
        this.isLoading = false;
      }
    });

  }

  ngOnDestroy(): void {
    // small delay to avoid race condition
    setTimeout(() => {
      this.zegoService.destroyRoom();
    }, 0);
  }

}
