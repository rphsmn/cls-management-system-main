import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Observable, combineLatest, BehaviorSubject, startWith, map, tap } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth';
// Import the utility
import { calculateWorkdays } from '../../../core/utils/workday-calculator.util';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent implements OnInit {
  currentUser$: Observable<User | null>;
  allFilteredRequests$: Observable<any[]>;
  paginatedRequests$: Observable<any[]>;
  
  itemsPerPage = 10;
  private currentPageSubject = new BehaviorSubject<number>(1);
  currentPage$ = this.currentPageSubject.asObservable();

  searchControl = new FormControl('', { nonNullable: true });
  monthControl = new FormControl(new Date().getMonth(), { nonNullable: true });
  yearControl = new FormControl(new Date().getFullYear(), { nonNullable: true });

  months = [
    { v: 0, l: 'Jan' }, { v: 1, l: 'Feb' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Apr' },
    { v: 4, l: 'May' }, { v: 5, l: 'Jun' }, { v: 6, l: 'Jul' }, { v: 7, l: 'Aug' },
    { v: 8, l: 'Sep' }, { v: 9, l: 'Oct' }, { v: 10, l: 'Nov' }, { v: 11, l: 'Dec' }
  ];
  years = [2024, 2025, 2026];
  
  expandedReq: any = null;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
    
    this.allFilteredRequests$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$,
      this.searchControl.valueChanges.pipe(startWith(''), tap(() => this.resetPagination())),
      this.monthControl.valueChanges.pipe(startWith(this.monthControl.value), tap(() => this.resetPagination())),
      this.yearControl.valueChanges.pipe(startWith(this.yearControl.value), tap(() => this.resetPagination()))
    ]).pipe(
      map(([user, requests, term, selMonth, selYear]) => {
        if (!user || !requests) return [];
        const s = term?.toLowerCase() || '';
        const userRole = user.role?.toUpperCase() || '';

        return requests.filter(req => {
          // 1. Search Logic
          const matchesSearch = 
            req.employeeName?.toLowerCase().includes(s) || 
            req.companyId?.toLowerCase().includes(s) ||
            req.type?.toLowerCase().includes(s);

          if (!matchesSearch) return false;

          // 2. Date Filter Logic
          if (!this.checkPeriodMatch(req.period, Number(selMonth), Number(selYear))) return false;

          // 3. Updated Role Permissions (Private HR Loop Logic)
          const isAdminOrHR = user.role === 'Admin Manager' || user.role === 'HR';
          const isSensitiveRequest = req.role === 'HR' || req.role === 'Admin Manager';

          // Staff/Devs only see their own.
          if (userRole.includes('STAFF') || userRole.includes('DEV') || userRole.includes('IT')) {
             return req.employeeName === user.name;
          }

          // Management/Supervisors see everyone EXCEPT the HR/Admin loop (unless they are part of it)
          if (isSensitiveRequest) {
            return isAdminOrHR;
          }

          return true;
        });
      })
    );

    this.paginatedRequests$ = combineLatest([
      this.allFilteredRequests$, 
      this.currentPage$
    ]).pipe(
      map(([reqs, page]) => {
        const start = (page - 1) * this.itemsPerPage;
        return reqs.slice(start, start + this.itemsPerPage);
      })
    );
  }

  ngOnInit(): void {}

  private resetPagination() { this.currentPageSubject.next(1); }

  private checkPeriodMatch(period: string, selMonth: number, selYear: number): boolean {
    if (!period) return false;
    const sep = period.includes(' to ') ? ' to ' : ' - ';
    const parts = period.split(sep);
    const start = new Date(parts[0]);
    return start.getMonth() === selMonth && start.getFullYear() === selYear;
  }

  // --- PROGRESS TRACKER LOGIC ---
  // (Keeping your current step logic as it correctly maps the approval flow)

  getSteps(req: any): string[] {
    const role = (req.role || '').toUpperCase();
    if (role === 'HR') return ['Admin']; 
    if (role === 'ADMIN MANAGER') return ['HR'];
    if (role.includes('DEV') || role.includes('SUP')) return ['Admin', 'HR'];
    return ['Sup', 'HR'];
  }

  getStepStatus(req: any, index: number): 'completed' | 'rejected' | 'pending' | '' {
    const status = req.status;
    if (index === 0) {
      if (status === 'Approved') return 'completed';
      if (status.includes('HR') || status.includes('Admin Approval')) return 'completed';
      if (status === 'Rejected' || (status.includes('Rejected') && !status.includes('HR'))) return 'rejected';
      return 'pending';
    }
    if (index === 1) {
      if (status === 'Approved') return 'completed';
      if (status.toLowerCase().includes('rejected by hr')) return 'rejected';
      if (status.includes('HR Approval')) return 'pending';
      return '';
    }
    return '';
  }

  getStepIcon(req: any, index: number): string {
    const stat = this.getStepStatus(req, index);
    if (stat === 'completed') return '✓';
    if (stat === 'rejected') return '✕';
    if (stat === 'pending') return '...';
    return '-';
  }

  // --- REFINED UI FORMATTERS ---

  getFormattedPeriod(period: string): string {
    if (!period) return 'N/A';
    
    // Fetch holidays to ensure the day count in history matches the Filing page
    const holidayList = JSON.parse(localStorage.getItem('company_holidays') || '[]');
    const diff = calculateWorkdays(period, holidayList);
    
    const sep = period.includes(' - ') ? ' - ' : ' to ';
    const parts = period.split(sep);
    const start = new Date(parts[0]);

    return `${diff} ${diff === 1 ? 'Day' : 'Days'} (${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  }

  getRelativeDate(d: any) { 
    const date = new Date(d); 
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    return date.toDateString() === yesterday.toDateString() ? 'Yesterday' : '';
  }

  toggleReason(r: any) { this.expandedReq = this.expandedReq === r ? null : r; }
  
  viewDocument(att: any) { 
    const newTab = window.open();
    newTab?.document.write(`<iframe src="${att.data}" frameborder="0" style="width:100%;height:100%;"></iframe>`); 
  }

  getLeaveIcon(t: string) { 
    const type = t?.toLowerCase() || '';
    if (type.includes('sick')) return '🤒';
    if (type.includes('birthday')) return '🎂';
    return '💰'; 
  }

  getTotalPages(t: number) { return Math.ceil(t / this.itemsPerPage) || 1; }
  getStartRange(t: number) { return t === 0 ? 0 : (this.currentPageSubject.value - 1) * this.itemsPerPage + 1; }
  getEndRange(t: number) { return Math.min(this.currentPageSubject.value * this.itemsPerPage, t); }
  prevPage() { if (this.currentPageSubject.value > 1) this.currentPageSubject.next(this.currentPageSubject.value - 1); }
  nextPage(t: number) { if (this.currentPageSubject.value < this.getTotalPages(t)) this.currentPageSubject.next(this.currentPageSubject.value + 1); }
  onItemsPerPageChange(e: any) { this.itemsPerPage = +e.target.value; this.currentPageSubject.next(1); }
}