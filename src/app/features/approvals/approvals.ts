import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map, combineLatest } from 'rxjs';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css'
})
export class ApprovalsComponent {
  requests$: Observable<any[]>;
  
  // Modal state management
  showModal: boolean = false;
  pendingAction: 'Approve' | 'Reject' | null = null;
  selectedRequest: any = null;

  constructor(private authService: AuthService) {
    this.requests$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$
    ]).pipe(
      map(([user, requests]) => {
        if (!user) return [];
        // Filters for requests where the user is the current target reviewer
        return requests.filter(req => 
          req.targetReviewer === user.role && 
          req.status !== 'Rejected' && 
          req.status !== 'Approved'
        );
      })
    );
  }

  // Matches (click)="updateStatus(req, 'Approve')"
  updateStatus(request: any, action: 'Approve' | 'Reject') {
    this.selectedRequest = request;
    this.pendingAction = action;
    this.showModal = true;
  }

  // Matches (click)="confirmAction()"
  confirmAction() {
    if (this.selectedRequest && this.pendingAction) {
      this.authService.updateRequestStatus(this.selectedRequest, this.pendingAction === 'Approve' ? 'Approved' : 'Rejected');
      this.closeModal();
    }
  }

  // Matches (click)="closeModal()"
  closeModal() {
    this.showModal = false;
    this.selectedRequest = null;
    this.pendingAction = null;
  }

  hasPendingRequests(requests: any[]): boolean {
    return requests && requests.length > 0;
  }
}