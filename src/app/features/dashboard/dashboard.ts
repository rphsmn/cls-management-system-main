import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map, combineLatest, switchMap, of } from 'rxjs';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  
  currentUser$: Observable<any>;
  requests$: Observable<any[]>; 
  greeting: string = '';
  today: Date = new Date();

  constructor() {
    // 1. Calculate Credits for the logged-in user
    this.currentUser$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$
    ]).pipe(
      map(([user, allRequests]) => {
        if (!user) return null;

        const myRequests = allRequests.filter(req => req.employeeName === user.name);

        const calculateDays = (reqList: any[]) => {
          return reqList.reduce((sum, req) => {
            if (req.period && req.period.includes(' - ')) {
              const dates = req.period.split(' - ');
              const start = new Date(dates[0]);
              const end = new Date(dates[1]);
              return sum + (Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
            }
            return sum + 1;
          }, 0);
        };

        return {
          ...user,
          displayCredits: {
            paidLeave: {
              used: calculateDays(myRequests.filter(r => r.type === 'Paid Leave' && r.status === 'Approved')),
              pending: calculateDays(myRequests.filter(r => r.type === 'Paid Leave' && (r.status === 'Pending' || r.status === 'Awaiting HR Approval')))
            },
            sickLeave: {
              used: calculateDays(myRequests.filter(r => r.type === 'Sick Leave' && r.status === 'Approved')),
              pending: calculateDays(myRequests.filter(r => r.type === 'Sick Leave' && (r.status === 'Pending' || r.status === 'Awaiting HR Approval')))
            },
            birthdayLeave: {
              used: calculateDays(myRequests.filter(r => r.type === 'Birthday Leave' && r.status === 'Approved')),
              pending: calculateDays(myRequests.filter(r => r.type === 'Birthday Leave' && (r.status === 'Pending' || r.status === 'Awaiting HR Approval')))
            }
          }
        };
      })
    );

    // 2. Personal Activity Stream (Strictly Filtered)
    this.requests$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        
        return this.authService.requests$.pipe(
          map(requests => {
            // Personal filter: only show requests filed by the current user
            return requests
              .filter(req => req.employeeName === user.name)
              .sort((a, b) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime())
              .slice(0, 5);
          })
        );
      })
    );
  }

  ngOnInit() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }
}