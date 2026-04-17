// Author: Poojitha

import { Routes } from '@angular/router';

export const STUDY_MATERIALS_ROUTES: Routes = [
  {
    path: 'create',
    loadComponent: () =>
      import(
        /* webpackChunkName: "study-material-create" */ './pages/create-edit-material/create-edit-material'
      ).then((m) => m.CreateEditMaterial),
  },
  {
    path: 'viewer/:moduleId',
    loadComponent: () =>
      import(
        /* webpackChunkName: "study-material-viewer" */ './pages/student-material-viewer/student-material-viewer'
      ).then((m) => m.StudentMaterialViewer),
  },
];
