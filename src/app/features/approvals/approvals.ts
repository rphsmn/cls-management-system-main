import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map, switchMap, take } from 'rxjs'; 
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
  public showModal = false;
  public pendingAction: 'Approve' | 'Reject' | null = null;
  public selectedRequest: any = null;

  constructor(private authService: AuthService) {
    /**
     * This logic watches the current user and the request list simultaneously.
     * It filters the list so Supervisors only see 'Pending' 
     * and HR only sees 'Awaiting HR Approval'.
     */
    this.requests$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        return this.authService.requests$.pipe(
          map(requests => {
            if (!user) return [];

            return requests.filter(req => {
              if (user.role.includes('Sup')) {
                // Supervisors only handle initial 'Pending' requests
                return req.status === 'Pending';
              } else if (user.role === 'HR' || user.role === 'Manager') {
                // HR/Manager only handles requests already cleared by Supervisors
                return req.status === 'Awaiting HR Approval';
              }
              return false;
            });
          })
        );
      })
    );
  }

  public hasPendingRequests(requests: any[] | null): boolean {
    return !!(requests && requests.length > 0);
  }

  public updateStatus(req: any, action: 'Approve' | 'Reject') {
    this.selectedRequest = req;
    this.pendingAction = action;
    this.showModal = true;
  }

  public confirmAction() {
    if (this.selectedRequest && this.pendingAction) {
      // We send the raw action ('Approve' or 'Reject') to the service.
      // The Service now handles the "Awaiting HR" vs "Approved" logic internally.
      const actionType = this.pendingAction === 'Approve' ? 'Approved' : 'Rejected';
      this.authService.updateRequestStatus(this.selectedRequest, actionType);
      this.closeModal();
    }
  }

  public closeModal() {
    this.showModal = false;
    this.selectedRequest = null;
    this.pendingAction = null;
  }
}