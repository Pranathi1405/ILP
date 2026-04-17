import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

export interface VerifyInvitationPayload {
  token: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AdminInvitationService {
  private api = inject(ApiService);

  /** POST /api/admin/admin-invitation/verify — no auth required */
  verifyInvitation(payload: VerifyInvitationPayload): Observable<ApiResponse> {
    return this.api.post<ApiResponse>('admin/admin-invitation/verify', payload);
  }
}
