import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Observable, map, combineLatest } from 'rxjs';
import { AuthService, User } from '../../../core/services/auth';

@Component({
  selector: 'app-file-leave',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './file-leave.html',
  styleUrl: './file-leave.css'
})
export class FileLeaveComponent implements OnInit {
  // This matches the variable name in your HTML error
  liveCredits$: Observable<any>;
  
  leaveRequest = {
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  };

  constructor(private authService: AuthService, private router: Router) {
    // Syncing the credit logic with the Dashboard
    this.liveCredits$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$
    ]).pipe(
      map(([user, allRequests]) => {
        if (!user) return null;

        const myApprovedRequests = allRequests.filter(req => 
          req.requesterName === user.name && 
          req.status.toLowerCase() === 'approved'
        );

        const calculateUsed = (type: string) => {
          return myApprovedRequests
            .filter(req => req.type.toLowerCase() === type.toLowerCase())
            .reduce((sum, req) => {
              let days = 0;
              if (req.period && req.period.includes(' - ')) {
                const dates = req.period.split(' - ');
                const start = new Date(dates[0]);
                const end = new Date(dates[1]);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                  const diffTime = Math.abs(end.getTime() - start.getTime());
                  days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }
              } else {
                days = parseFloat(req.period) || 0;
              }
              return sum + days;
            }, 0);
        };

        return {
          ...user,
          liveCredits: {
            paidLeave: Math.max(0, user.credits.paidLeave - calculateUsed('paid leave')),
            birthdayLeave: Math.max(0, user.credits.birthdayLeave - calculateUsed('birthday leave')),
            sickLeave: Math.max(0, user.credits.sickLeave - calculateUsed('sick leave'))
          }
        };
      })
    );
  }

  ngOnInit(): void {}

onSubmit() {
  // 1. Calculate the period string
  const period = this.leaveRequest.startDate === this.leaveRequest.endDate 
    ? this.leaveRequest.startDate 
    : `${this.leaveRequest.startDate} - ${this.leaveRequest.endDate}`;

  // 2. Get the current user's name from the auth service directly
  // This ensures the Supervisor sees the REAL name (e.g., "Reymart L. Prado")
  const currentUserName = this.authService['currentUserSubject'].value?.name || 'Staff';

  const newRequest = {
    type: this.leaveRequest.type,
    period: period,
    reason: this.leaveRequest.reason,
    status: 'Pending',
    dateFiled: new Date().toISOString(),
    requesterName: currentUserName // FIX: Use the dynamic name
  };

  this.authService.addRequest(newRequest);
  this.router.navigate(['/history']);
}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}