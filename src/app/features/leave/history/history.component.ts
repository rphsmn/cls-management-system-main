import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, combineLatest, BehaviorSubject, startWith, map } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
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
      this.authService.requests$,
      this.searchControl.valueChanges.pipe(startWith(''))
    ]).pipe(
      map(([requests, searchTerm]) => {
        const term = searchTerm?.toLowerCase() || '';
        const filtered = requests.filter(req => 
          (req.employeeName?.toLowerCase().includes(term)) || 
          (req.companyId?.toLowerCase().includes(term)) ||
          (req.type?.toLowerCase().includes(term))
        );
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

  private autoFixPagination(totalItems: number) {
    const maxPages = Math.ceil(totalItems / this.itemsPerPage) || 1;
    if (this.currentPageSubject.value > maxPages) {
      this.currentPageSubject.next(maxPages);
    }
  }

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

    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `${diffDays} ${diffDays === 1 ? 'Day' : 'Days'} (${startLabel}${diffDays > 1 ? ' - ' + endLabel : ''})`;
  }

  getRelativeDate(dateInput: any): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    return date.toDateString() === yesterday.toDateString() ? 'Yesterday' : ''; 
  }

  toggleReason(req: any) { this.expandedReq = (this.expandedReq === req) ? null : req; }

  viewDocument(attachment: any) {
    if (!attachment || !attachment.data) return;
    const newTab = window.open();
    newTab?.document.write(`<iframe src="${attachment.data}" frameborder="0" style="width:100%; height:100%;"></iframe>`);
  }

  getTotalPages(totalItems: number): number { return Math.ceil(totalItems / this.itemsPerPage) || 1; }
  getStartRange(totalItems: number): number { return totalItems === 0 ? 0 : (this.currentPageSubject.value - 1) * this.itemsPerPage + 1; }
  getEndRange(totalItems: number): number { 
    const end = this.currentPageSubject.value * this.itemsPerPage;
    return end > totalItems ? totalItems : end; 
  }

  onItemsPerPageChange(event: any) { this.itemsPerPage = Number(event.target.value); this.currentPageSubject.next(1); }
  nextPage(totalItems: number) { if (this.currentPageSubject.value < this.getTotalPages(totalItems)) this.currentPageSubject.next(this.currentPageSubject.value + 1); }
  prevPage() { if (this.currentPageSubject.value > 1) this.currentPageSubject.next(this.currentPageSubject.value - 1); }

  getSupervisorClass(req: any) {
    if (req.status === 'Approved' || req.status === 'Awaiting HR Approval') return 'completed';
    if (req.status === 'Rejected' && req.targetReviewer?.includes('Supervisor')) return 'rejected';
    return '';
  }

  getSupervisorIcon(req: any) {
    const cls = this.getSupervisorClass(req);
    return cls === 'completed' ? '✓' : cls === 'rejected' ? '✕' : '?';
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

  getLeaveIcon(type: string): string {
    const icons: any = { 'Birthday Leave': '🎂', 'Sick Leave': '🤒', 'Paid Leave': '💰' };
    return icons[type] || '📄';
  }
}