import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit {
  currentUser$: Observable<User | null>;
  requests$: Observable<any[]>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    this.requests$ = this.authService.requests$;
  }

  ngOnInit(): void {}

  logout() {
    this.authService.logout();
  }

  // Logic to determine CSS classes for the progress tracker steps
  getSupervisorClass(req: any) {
    if (req.status === 'Approved' || req.status === 'Awaiting HR Approval') return 'completed';
    if (req.status === 'Rejected' && req.targetReviewer?.includes('Sup')) return 'rejected';
    return '';
  }

  getSupervisorIcon(req: any) {
    const cls = this.getSupervisorClass(req);
    if (cls === 'completed') return '✓';
    if (cls === 'rejected') return '✕';
    return '?';
  }

  getHRClass(req: any) {
    if (req.status === 'Approved') return 'completed';
    if (req.status === 'Rejected' && (req.targetReviewer === 'HR' || req.targetReviewer === 'Manager')) return 'rejected';
    return '';
  }

  getHRIcon(req: any) {
    const cls = this.getHRClass(req);
    if (cls === 'completed') return '✓';
    if (cls === 'rejected') return '✕';
    return req.status === 'Awaiting HR Approval' ? '...' : '-';
  }
}