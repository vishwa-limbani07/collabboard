import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/pages/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'board/:id',
    loadComponent: () =>
      import('./features/board/pages/board/board.component').then(
        (m) => m.BoardComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'join/:inviteCode',
    loadComponent: () =>
      import('./features/board/pages/join/join.component').then(
        (m) => m.JoinComponent,
      ),
    canActivate: [authGuard],
  },
];