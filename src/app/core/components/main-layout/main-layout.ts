import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css']
})
export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  showLogoutModal = false;
  currentUser$ = this.authService.currentUser$;

  confirmLogout() { this.showLogoutModal = true; }
  cancelLogout() { this.showLogoutModal = false; }
  executeLogout() {
    this.authService.logout();
    this.showLogoutModal = false;
    this.router.navigate(['/login']);
  }

  hasAccess(role: string): boolean {
    return this.canSeeEmployees(role) || this.canSeeApprovals(role);
  }

  canSeeEmployees(role: string): boolean {
    const r = role?.toUpperCase();
    return ['HR', 'ADMIN MANAGER', 'ADM-MGR', 'MANAGER', 'MGR'].includes(r);
  }

  canSeeApprovals(role: string): boolean {
    const r = role?.toUpperCase();
    return r?.includes('SUPERVISOR') || r?.includes('MANAGER') || r?.includes('MGR') || r === 'HR';
  }
}