import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth';
import { User } from '../../core/models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css'
})
export class ApprovalsComponent implements OnInit {
  requests$: Observable<any[]>;
  currentUser: User | null = null;

  constructor(private authService: AuthService) {
    this.requests$ = this.authService.requests$;
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe((user: User | null) => {
      this.currentUser = user;
    });
  }

  canApprove(req: any): boolean {
    if (!this.currentUser) return false;
    return req.targetReviewer === this.currentUser.role;
  }

  updateStatus(req: any, status: string) {
    this.authService.updateRequestStatus(req, status);
  }
}