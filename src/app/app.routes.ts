import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password'; // The missing piece!
import { MainLayoutComponent } from './core/components/main-layout/main-layout';
import { DashboardComponent } from './features/dashboard/dashboard';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent, 
    title: 'Login | COR LOGICS' 
  },
  { 
    path: 'forgot-password', 
    component: ForgotPasswordComponent, 
    title: 'Forgot Password | COR LOGICS' 
  },
  { 
    path: 'reset-password', 
    component: ResetPasswordComponent, 
    title: 'Reset Password | COR LOGICS' 
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];