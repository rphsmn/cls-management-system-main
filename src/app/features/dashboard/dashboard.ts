import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, map, switchMap, combineLatest } from 'rxjs';
import { AuthService, User } from '../../core/services/auth';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<any>;
  requests$: Observable<any[]>; 
  greeting: string = '';
  today: Date = new Date();

  constructor(private authService: AuthService, private router: Router) {
    
    this.currentUser$ = combineLatest([
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

    this.requests$ = this.authService.currentUser$.pipe(
      switchMap(user => 
        this.authService.requests$.pipe(
          map(requests => {
            if (!user) return [];
            const filtered = (user.role !== 'Ops Staff') 
              ? [...requests] 
              : requests.filter(req => req.requesterName === user.name);
            
            return filtered
              .sort((a, b) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime())
              .slice(0, 5);
          })
        )
      )
    );
  }

  ngOnInit() {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }
}