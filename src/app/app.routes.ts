import { Routes } from '@angular/router';
import { MainLayoutComponent } from './core/components/main-layout/main-layout'; 
import { DashboardComponent } from './features/dashboard/dashboard';
import { FileLeaveComponent } from './features/leave/file-leave/file-leave';
import { ApprovalsComponent } from './features/approvals/approvals';
import { HistoryComponent } from './features/leave/history/history.component';
import { LoginComponent } from './features/auth/login/login';
import { ProfileComponent } from './features/profile/profile';
import { Calendar } from './features/calendar/calendar';
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'file-leave', component: FileLeaveComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'approvals', component: ApprovalsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'calendar', component: Calendar },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/login' }
];