import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService, Attachment } from '../../../core/services/auth';
import { Observable, combineLatest, map, take } from 'rxjs';
// Ensure this path matches where you created the utility
import { calculateWorkdays } from '../../../core/utils/workday-calculator.util';

@Component({
  selector: 'app-file-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './file-leave.html',
  styleUrls: ['./file-leave.css']
})
export class FileLeaveComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  liveCredits$: Observable<any>;
  minDate: string = '';
  totalDays: number = 0;
  isOverBalance: boolean = false;
  isInsufficientNotice: boolean = false;
  noticeRequired: number = 0;
  
  leaveRequest = {
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  };

  selectedFile: Attachment | null = null;
  fileName = '';
  showSuccessToast = false;

  constructor() {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];

    // Get holidays once to use in calculations
    const holidayList = JSON.parse(localStorage.getItem('company_holidays') || '[]');

    this.liveCredits$ = combineLatest([
      this.authService.currentUser$,
      this.authService.requests$
    ]).pipe(
      map(([user, allRequests]) => {
        if (!user) return null;
        const isBirthMonth = user.birthDate ? 
          new Date(user.birthDate).getMonth() === new Date().getMonth() : false;

        const myRequests = allRequests.filter(req => req.employeeName === user.name);
        
        const calc = (type: string, status: 'pending' | 'approved') => {
          return myRequests
            .filter(r => {
              const isSameType = r.type === type;
              const rStatus = r.status.toLowerCase();
              return status === 'approved' 
                ? (isSameType && rStatus === 'approved')
                : (isSameType && (rStatus.includes('pending') || rStatus.includes('hr')));
            })
            .reduce((sum, r) => {
              // UPDATED: Use the utility for accurate balance calculation
              return sum + calculateWorkdays(r.period, holidayList);
            }, 0);
        };

        return {
          ...user,
          isBirthMonth,
          balances: {
            'Paid Leave': { rem: user.credits.paidLeave - calc('Paid Leave', 'approved'), pen: calc('Paid Leave', 'pending') },
            'Sick Leave': { rem: user.credits.sickLeave - calc('Sick Leave', 'approved'), pen: calc('Sick Leave', 'pending') },
            'Birthday Leave': { rem: user.credits.birthdayLeave - calc('Birthday Leave', 'approved'), pen: calc('Birthday Leave', 'pending') }
          }
        };
      })
    );
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        const selectedDate = params['date'];
        const finalDate = selectedDate < this.minDate ? this.minDate : selectedDate;
        
        this.leaveRequest.startDate = finalDate;
        this.leaveRequest.endDate = finalDate;
        
        if (!this.leaveRequest.type) {
          this.leaveRequest.type = 'Paid Leave';
        }
        
        this.calculateDays();
      }
    });
  }

  calculateDays() {
    if (this.leaveRequest.startDate && this.leaveRequest.endDate) {
      const start = new Date(this.leaveRequest.startDate);
      const end = new Date(this.leaveRequest.endDate);
      
      if (end < start) {
        this.leaveRequest.endDate = this.leaveRequest.startDate;
      }

      // UPDATED: Use utility to calculate totalDays for the UI
      const holidayList = JSON.parse(localStorage.getItem('company_holidays') || '[]');
      const period = `${this.leaveRequest.startDate} to ${this.leaveRequest.endDate}`;
      this.totalDays = calculateWorkdays(period, holidayList);

      // Notice Logic (Notice is still based on calendar days from TODAY)
      const today = new Date();
      today.setHours(0,0,0,0);
      const noticeDiff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (this.leaveRequest.type === 'Paid Leave') {
        if (this.totalDays <= 2) this.noticeRequired = 3;
        else if (this.totalDays === 3) this.noticeRequired = 5;
        else this.noticeRequired = 7;
        this.isInsufficientNotice = noticeDiff < this.noticeRequired;
      } else {
        this.isInsufficientNotice = false;
        this.noticeRequired = 0;
      }
      
      this.checkBalance();
    }
  }

  checkBalance() {
    if (!this.leaveRequest.type) return;
    this.liveCredits$.pipe(take(1)).subscribe(user => {
      if (user) {
        const available = user.balances[this.leaveRequest.type].rem;
        this.isOverBalance = this.totalDays > available;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedFile = { name: file.name, type: file.type, data: reader.result as string };
    };
    reader.readAsDataURL(file);
  }

  removeFile() {
    this.fileName = '';
    this.selectedFile = null;
  }

  onSubmit() {
    if (this.isOverBalance || this.isInsufficientNotice || this.totalDays <= 0) return;

    const period = this.leaveRequest.startDate === this.leaveRequest.endDate 
      ? this.leaveRequest.startDate 
      : `${this.leaveRequest.startDate} to ${this.leaveRequest.endDate}`;
    
    const newRequest = {
      type: this.leaveRequest.type,
      period: period,
      reason: this.leaveRequest.reason,
      dateFiled: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      attachment: this.selectedFile,
      status: 'Pending'
    };

    this.authService.addRequest(newRequest);
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
      this.router.navigate(['/my-tracker']);
    }, 2000);
  }
}