import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, map, switchMap, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
  public requests$: Observable<any[]>;

  constructor(private authService: AuthService) {
    this.requests$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);
        return this.authService.requests$.pipe(
          map(all => all.filter(req => req.requesterName === user.name))
        );
      })
    );
  }
}