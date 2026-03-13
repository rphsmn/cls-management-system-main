import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, Attachment } from '../../../core/services/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-file-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './file-leave.html',
  styleUrls: ['./file-leave.css']
})
export class FileLeaveComponent {
  liveCredits$: Observable<any>;
  
  leaveRequest = {
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  };

  selectedFile: Attachment | null = null;
  fileName = '';
  showSuccessToast = false;

  constructor(private authService: AuthService, private router: Router) {
    this.liveCredits$ = this.authService.currentUser$;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // 2MB Limit Check
    const maxSize = 2 * 1024 * 1024; 
    if (file.size > maxSize) {
      alert('File is too large! Please upload a document smaller than 2MB.');
      event.target.value = ''; 
      return;
    }

    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFile = {
        name: file.name,
        type: file.type,
        data: reader.result as string
      };
    };
    reader.readAsDataURL(file);
  }

  onSubmit() {
    const period = this.leaveRequest.startDate === this.leaveRequest.endDate 
      ? this.leaveRequest.startDate 
      : `${this.leaveRequest.startDate} - ${this.leaveRequest.endDate}`;
    
    const newRequest = {
      type: this.leaveRequest.type,
      period: period,
      reason: this.leaveRequest.reason,
      dateFiled: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      attachment: this.selectedFile
    };

    this.authService.addRequest(newRequest);

    // Show Toast
    this.showSuccessToast = true;

    // Wait for animation to settle before redirecting
    setTimeout(() => {
      this.showSuccessToast = false;
      this.router.navigate(['/history']);
    }, 3000);
  }
}