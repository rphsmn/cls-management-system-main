import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { FileLeaveComponent } from './features/leave/file-leave/file-leave';
import { ApprovalsComponent } from './features/approvals/approvals';
import { HistoryComponent } from './features/leave/history/history.component';
import { LoginComponent } from './features/auth/login/login';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'file-leave', component: FileLeaveComponent },
  { path: 'approvals', component: ApprovalsComponent },
  { path: 'history', component: HistoryComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];