import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Dashboard (Member 4)
  { path: 'dashboard', loadComponent: () => import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent) },

  // Production Module (Member 1)
  { path: 'production/orders', loadComponent: () => import('./modules/production/production-orders.component').then(m => m.ProductionOrdersComponent) },
  { path: 'production/orders/create', loadComponent: () => import('./modules/production/production-order-form.component').then(m => m.ProductionOrderFormComponent) },
  { path: 'production/orders/edit/:id', loadComponent: () => import('./modules/production/production-order-form.component').then(m => m.ProductionOrderFormComponent) },
  { path: 'production/work-centres', loadComponent: () => import('./modules/production/work-centres.component').then(m => m.WorkCentresComponent) },
  { path: 'production/scheduling', loadComponent: () => import('./modules/production/scheduling.component').then(m => m.SchedulingComponent) },

  // Materials Module (Member 2)
  { path: 'materials/raw-materials', loadComponent: () => import('./modules/materials/raw-materials.component').then(m => m.RawMaterialsComponent) },
  { path: 'materials/bom', loadComponent: () => import('./modules/materials/bom.component').then(m => m.BomComponent) },
  { path: 'materials/inventory', loadComponent: () => import('./modules/materials/inventory.component').then(m => m.InventoryComponent) },

  // Quality Module (Member 3)
  { path: 'quality/inspections', loadComponent: () => import('./modules/quality/inspections.component').then(m => m.InspectionsComponent) },
  { path: 'quality/defects', loadComponent: () => import('./modules/quality/defects.component').then(m => m.DefectsComponent) },
  { path: 'quality/corrective-actions', loadComponent: () => import('./modules/quality/corrective-actions.component').then(m => m.CorrectiveActionsComponent) },

  // Analytics Module (Member 4)
  { path: 'analytics/downtime', loadComponent: () => import('./modules/dashboard/downtime.component').then(m => m.DowntimeComponent) },
  { path: 'analytics/yield', loadComponent: () => import('./modules/dashboard/yield-analytics.component').then(m => m.YieldAnalyticsComponent) },

  { path: '**', redirectTo: 'dashboard' }
];
