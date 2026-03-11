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
  public requests$: Observable<any[]>;
  // FIXED: Added missing properties for the rejection modal
  public showModal = false;
  public pendingAction: 'Approve' | 'Reject' | null = null;
  public selectedRequest: any = null;

  constructor(private authService: AuthService) {
    this.requests$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$
    ]).pipe(
      map(([user, requests]) => {
        if (!user) return [];
        // Filters requests so HR only sees what they need to approve/reject
        return requests.filter(req => req.targetReviewer === user.role);
      })
    );
  }

  public updateStatus(req: any, action: 'Approve' | 'Reject') {
    this.selectedRequest = req;
    this.pendingAction = action;
    this.showModal = true;
  }

  // FIXED: Added missing confirmation logic
  public confirmAction() {
    if (this.selectedRequest && this.pendingAction) {
      this.authService.updateRequestStatus(
        this.selectedRequest, 
        this.pendingAction === 'Approve' ? 'Approved' : 'Rejected'
      );
      this.closeModal();
    }
  }

  public closeModal() {
    this.showModal = false;
    this.selectedRequest = null;
    this.pendingAction = null;
  }

  // FIXED: Added missing helper method
  public hasPendingRequests(requests: any[] | null): boolean {
    return !!(requests && requests.length > 0);
  }
}