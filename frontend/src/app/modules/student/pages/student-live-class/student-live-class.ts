// Author : Poojitha
// Student side live class Streaming Page
import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, inject
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ZegoLiveKitService } from '../../../../shared/services/zego-live-kit.service';
import { LiveClassService } from '../../../../core/services/liveClasses/live-class.service';
@Component({
  selector: 'app-student-live-class',
  imports: [],
  templateUrl: './student-live-class.html',
  styleUrl: './student-live-class.css',
})
export class StudentLiveClass implements OnInit, OnDestroy {


  @ViewChild('container', { static: true })
  container!: ElementRef;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private zegoService = inject(ZegoLiveKitService);
  private liveClassService = inject(LiveClassService);

  errorMessage = '';
  private hasLeft = false;


 ngOnInit() {
  const classId = this.route.snapshot.paramMap.get('id');

  if (!classId) {
    this.errorMessage = 'Invalid class';
    this.router.navigate(['/student']);
    return;
  }

  this.liveClassService.joinClass(classId).subscribe({
    next: (zego: any) => {
      console.log('Zego session:', zego);

      
      this.zegoService.joinRoom(
        this.container.nativeElement,
        Number(classId),
        zego,
        () => this.handleLeave(classId)
      );
    },
    error: (err) => {
      console.error(err);

      //  Handle backend error message properly
      this.errorMessage =
        err?.error?.message || 'Unable to join live class';
    }
  });
}

  ngOnDestroy(): void {
  // const classId = this.route.snapshot.paramMap.get('id');
 console.log('Destroying component');

  setTimeout(() => {
    this.zegoService.destroyRoom();
  }, 100);
}

private handleLeave(classId: string) {
  if (this.hasLeft) return;
  this.hasLeft = true;

  console.log('Leaving class...'); // DEBUG POINT

  this.liveClassService.leaveClass(classId).subscribe({
    next: () => {
      console.log('Leave API success'); // DEBUG
         setTimeout(() => {
        this.router.navigate(['/student']);
      }, 50); // Slight delay to ensure navigation happens after any cleanup
    },
    error: (err) => {
      console.error('Leave API error:', err); // DEBUG
      this.router.navigate(['/student']);
    }
  });
}


}
