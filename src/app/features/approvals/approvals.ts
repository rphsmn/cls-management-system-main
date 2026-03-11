import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of, BehaviorSubject } from 'rxjs'; // Added BehaviorSubject

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css'
})
export class ApprovalsComponent implements OnInit {
  
  // Using a BehaviorSubject allows us to "push" updates to the list
  private requestsSubject = new BehaviorSubject<any[]>([
    { id: 1, requesterName: 'Ralph', requesterRole: 'Ops Staff', type: 'Paid Leave', reason: 'try5', status: 'Pending', stage: 'Initial' }
  ]);
  
  requests$ = this.requestsSubject.asObservable();
  
  showModal = false;
  pendingAction: 'Approve' | 'Reject' | null = null;
  selectedRequest: any = null;
  loading = false; 
  noRequests = false;

  ngOnInit(): void {}

  updateStatus(request: any, action: 'Approve' | 'Reject') {
    this.selectedRequest = request;
    this.pendingAction = action;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedRequest = null;
    this.pendingAction = null;
  }

  confirmAction() {
    if (this.selectedRequest && this.pendingAction) {
      // 1. Get the current list of requests
      const currentRequests = this.requestsSubject.value;

      // 2. Logic: If approved, it moves out of this "Pending" view 
      // (In your real app, this is where you call your Python backend)
      const updatedRequests = currentRequests.filter(req => req.id !== this.selectedRequest.id);

      // 3. Update the stream so the UI disappears the row
      this.requestsSubject.next(updatedRequests);

      console.log(`${this.pendingAction} confirmed for ${this.selectedRequest.requesterName}`);
      
      this.closeModal();
    }
  }

  hasPendingRequests(requests: any[] | null): boolean {
    return !!requests && requests.length > 0;
  }
}