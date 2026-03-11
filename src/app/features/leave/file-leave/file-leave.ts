import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-file-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './file-leave.html',
  styleUrl: './file-leave.css'
})
export class FileLeaveComponent {
  leaveType: string = 'Paid Leave';
  startDate: string = '';
  endDate: string = '';
  leaveReason: string = '';

  constructor(private authService: AuthService, private router: Router) {}

  submitLeave() {
    if (!this.startDate || !this.endDate || !this.leaveReason) {
      alert('Please fill in all fields');
      return;
    }

    const newRequest = {
      type: this.leaveType,
      reason: this.leaveReason,
      dateFiled: new Date().toISOString(),
      period: `${this.startDate} - ${this.endDate}`
    };

    // Use the authService to save the request
    this.authService.addRequest(newRequest);

    alert('Leave request submitted!');
    
    // Redirecting to '/history' to match your app.routes.ts
    // This prevents the AuthGuard from getting confused by nested paths
    this.router.navigate(['/history']);
  }
}