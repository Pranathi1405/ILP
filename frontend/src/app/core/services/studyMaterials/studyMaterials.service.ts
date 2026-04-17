// Author: Poojitha
// Study Material API Service (aligned with ApiService pattern)

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

//  Payload Interface
export interface CreateStudyMaterialPayload {
  moduleId: number;
  materialName: string;
  resourceType: 'document' | 'pdf';
  contentHtml?: string | null;
  pdfUrl?: string | null;
  fileSize?: number | null;
  isPublished: number; // 0 | 1
}

// Response Interface 
export interface CreateStudyMaterialResponse {
  materialId: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class StudyMaterialService {
  private api = inject(ApiService);

  //  Teacher side CREATE STUDY MATERIAL (DOCUMENT + PDF)
  createStudyMaterial(
    payload: CreateStudyMaterialPayload
  ): Observable<CreateStudyMaterialResponse> {
    return this.api.post<CreateStudyMaterialResponse>(
      'study-materials',
      payload
    );
  }

  // GET Study Materials (Student Side)
getStudyMaterials(params: {
  moduleId: number;
  resourceType?: 'pdf' | 'document';
  page?: number;
  limit?: number;
}) {

  const query = `?moduleId=${params.moduleId}&resourceType=${params.resourceType}&page=${params.page}&limit=${params.limit}`;

  return this.api.get<any>(`study-materials${query}`);
}
// GET single material by ID
getStudyMaterialById(id: number) {
  return this.api.get<any>(`study-materials/${id}`);
}


}
