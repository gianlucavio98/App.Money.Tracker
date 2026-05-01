import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'expenses',
    loadComponent: () => import('./components/expense-list/expense-list.component').then(m => m.ExpenseListComponent),
    canActivate: [authGuard],
  },
  {
    path: 'add-expense',
    loadComponent: () => import('./components/expense-form/expense-form.component').then(m => m.ExpenseFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'edit-expense/:id',
    loadComponent: () => import('./components/expense-form/expense-form.component').then(m => m.ExpenseFormComponent),
    canActivate: [authGuard],
  },
  {
    path: 'analytics',
    loadComponent: () => import('./components/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard],
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' },
];
