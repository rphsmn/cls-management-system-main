import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { RouterModule } from '@angular/router'; 
import { FormControl, ReactiveFormsModule } from '@angular/forms'; 
import { Observable, map, combineLatest, startWith, BehaviorSubject } from 'rxjs';
import { AuthService, User } from '../../core/services/auth';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './approvals.html',
  styleUrls: ['./approvals.css']
})
export class ApprovalsComponent {
  currentUser$: Observable<User | null>;
  allFilteredRequests$: Observable<any[]>;
  paginatedRequests$: Observable<any[]>;
  
  itemsPerPage = 10;
  private currentPageSubject = new BehaviorSubject<number>(1);
  currentPage$ = this.currentPageSubject.asObservable();
  
  searchControl = new FormControl('');
  expandedReq: any = null;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;

    this.allFilteredRequests$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([user, allRequests, searchTerm]) => {
        if (!user || !allRequests) return [];
        const term = searchTerm?.toLowerCase() || '';

        const filtered = allRequests.filter(req => {
          const matchesSearch = 
            req.employeeName?.toLowerCase().includes(term) || 
            req.companyId?.toLowerCase().includes(term) ||
            req.type?.toLowerCase().includes(term);

          if (!matchesSearch) return false;

          // Only show what this specific user is allowed to approve
          if (user.role === 'Ops Sup' || user.role === 'Supervisor') {
            return req.status === 'Pending' && req.targetReviewer === 'Supervisor';
          }
          if (user.role === 'HR' || user.role === 'Manager') {
            return req.status === 'Awaiting HR Approval' && req.targetReviewer === 'HR';
          }
          return false;
        });

        this.autoFixPagination(filtered.length);
        return filtered;
      })
    );

    this.paginatedRequests$ = combineLatest([
      this.allFilteredRequests$,
      this.currentPage$
    ]).pipe(
      map(([requests, page]) => {
        const start = (page - 1) * this.itemsPerPage;
        return requests.slice(start, start + this.itemsPerPage);
      })
    );

    this.searchControl.valueChanges.subscribe(() => this.currentPageSubject.next(1));
  }

  // Logic to calculate duration (e.g. 4 Days)
  getFormattedPeriod(period: string): string {
    if (!period) return 'N/A';
    const separator = period.includes(' to ') ? ' to ' : ' - ';
    if (!period.includes(separator)) {
      const date = new Date(period);
      return `1 Day (${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
    }
    const parts = period.split(separator);
    const start = new Date(parts[0].trim());
    const end = new Date(parts[1].trim());
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  }

  private autoFixPagination(totalItems: number) {
    const maxPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
    if (this.currentPageSubject.value > maxPages) {
      this.currentPageSubject.next(maxPages);
    }
  }

  viewDocument(attachment: any) {
    if (!attachment || !attachment.data) return;
    const newTab = window.open();
    newTab?.document.write(`<iframe src="${attachment.data}" frameborder="0" style="width:100%; height:100%;"></iframe>`);
  }

  getTotalPages(totalItems: number): number { return Math.ceil(totalItems / this.itemsPerPage) || 1; }
  getStartRange(totalItems: number): number { return totalItems === 0 ? 0 : (this.currentPageSubject.value - 1) * this.itemsPerPage + 1; }
  getEndRange(totalItems: number): number { return Math.min(this.currentPageSubject.value * this.itemsPerPage, totalItems); }

  onItemsPerPageChange(event: any) { this.itemsPerPage = Number(event.target.value); this.currentPageSubject.next(1); }
  nextPage(totalItems: number) { if (this.currentPageSubject.value < this.getTotalPages(totalItems)) this.currentPageSubject.next(this.currentPageSubject.value + 1); }
  prevPage() { if (this.currentPageSubject.value > 1) this.currentPageSubject.next(this.currentPageSubject.value - 1); }

updateStatus(req: any, action: string) {
  const isApprove = action === 'Approve';
  
  Swal.fire({
    title: `<div style="color: #1a5336; font-weight: 800; font-size: 24px; margin-bottom: 10px;">Confirm ${action}?</div>`,
    html: `
      <div style="font-size: 15px; color: #64748b; line-height: 1.5;">
        You are about to <strong>${action.toLowerCase()}</strong> the leave request for 
        <div style="color: #1e293b; font-weight: 700; margin-top: 8px; font-size: 16px;">${req.employeeName}</div>
      </div>
    `,
    icon: isApprove ? 'success' : 'warning',
    iconColor: isApprove ? '#1a5336' : '#ef4444',
    showCancelButton: true,
    confirmButtonText: `Yes, ${action}`,
    cancelButtonText: 'No, Cancel',
    reverseButtons: true,
    buttonsStyling: false, // This tells Swal to use our CSS classes instead of default ones
    customClass: {
      popup: 'swal-premium-popup',
      confirmButton: isApprove ? 'swal-confirm-mint' : 'swal-confirm-danger',
      cancelButton: 'swal-cancel-outline',
      actions: 'swal-button-container' // Added a hook for button spacing
    },
    showClass: { popup: 'animate__animated animate__fadeInUp animate__faster' },
    hideClass: { popup: 'animate__animated animate__fadeOutDown animate__faster' }
  }).then((result) => {
    if (result.isConfirmed) {
      this.authService.updateRequestStatus(req.id, action);
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true
      });
      
      Toast.fire({
        icon: 'success',
        title: `Request ${action}d successfully`
      });
    }
  });
}

  toggleReason(req: any) { this.expandedReq = (this.expandedReq === req) ? null : req; }
  getLeaveIcon(type: string): string {
    const icons: any = { 'Birthday Leave': '🎂', 'Sick Leave': '🤒', 'Paid Leave': '💰' };
    return icons[type] || '📄';
  }
}