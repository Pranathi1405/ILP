// Author: Poojitha
// Service to manage ZEGO live streaming sessions for both teachers and students
import { Injectable } from '@angular/core';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import ZIM from 'zego-zim-web';
import { BroadcastTokenResponse } from '../../modules/teacher/pages/live-classes/models/live-class.model';

@Injectable({ providedIn: 'root' })
export class ZegoLiveKitService {

  private roomInstance: ReturnType<typeof ZegoUIKitPrebuilt.create> | null = null;

 joinRoom(
  element: HTMLElement,
  classId: number,
  session: BroadcastTokenResponse,
  onLeaveRoom?: () => void
): void {

  this.destroyRoom();

  const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
    session.app_id,
    session.token,
    session.room_id,
    session.user_id,
    session.user_name
  );

  this.roomInstance = ZegoUIKitPrebuilt.create(kitToken);
  this.roomInstance.addPlugins({ ZIM });

  const isHost = session.role === 'Host';

  const commonConfig: any = {
    container: element,

    sharedLinks: [
      {
        name: 'Copy join link',
        url: `${window.location.origin}/teacher/live-studio/live-session/${classId}`,
      },
    ],

    scenario: {
      mode: ZegoUIKitPrebuilt.VideoConference,
      config: {
        role: isHost
          ? ZegoUIKitPrebuilt.Host
          : ZegoUIKitPrebuilt.Audience,
      },
    },

    showPreJoinView: true,
    showTextChat: true,
    showUserList: true,
    showRoomTimer: true,
    showLayoutButton: true,
    layout: 'Auto',
    maxUsers: 50,

    onLeaveRoom: () => {
      onLeaveRoom?.();
    },
  };

  //  ONLY add media controls for HOST
  if (isHost) {
    Object.assign(commonConfig, {
      turnOnCameraWhenJoining: true,
      turnOnMicrophoneWhenJoining: true,

      showMyCameraToggleButton: true,
      showMyMicrophoneToggleButton: true,
      showAudioVideoSettingsButton: true,
      showScreenSharingButton: true,
    });
  } 
  this.roomInstance.joinRoom(commonConfig);
}

  destroyRoom(): void {
  if (this.roomInstance) {
    try {
      this.roomInstance.destroy();
    } catch (e) {
      console.warn('Zego destroy error:', e);
    } finally {
      this.roomInstance = null;
    }
  }
}

}
