import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentDate = new Date();
  days: any[] = [];
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  selectedDay: any = null;
  showModal = false;
  isNoticeWarning = false;
  suggestedNoticeDays = 3;

  holidays = [
    { date: '2026-03-09', name: 'Labour Day (VIC/TAS)', region: 'au', type: 'regular' },
    { date: '2026-03-17', name: 'St. Patrick\'s Day', region: 'au', type: 'special-non' },
    { date: '2026-03-23', name: 'Otago Anniversary', region: 'au', type: 'regular' },
    { date: '2026-04-02', name: 'Maundy Thursday', region: 'ph', type: 'regular' },
    { date: '2026-04-03', name: 'Good Friday', region: 'both', type: 'regular' },
    { date: '2026-04-04', name: 'Black Saturday', region: 'ph', type: 'special-non' },
    { date: '2026-04-06', name: 'Easter Monday', region: 'au', type: 'regular' },
    { date: '2026-04-09', name: 'Araw ng Kagitingan', region: 'ph', type: 'regular' }
  ];

  ngOnInit() {
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allRequests = (this.authService as any).requestsSubject?.value || [];

    this.days = [];

    for (let i = 0; i < firstDay; i++) {
      this.days.push({ empty: true });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const holiday = this.holidays.find(h => h.date === dateStr);
      
      const awayCount = allRequests.filter((r: any) => 
        r.status === 'Approved' && this.isDateInPeriod(dateObj, r.period)
      ).length;

      this.days.push({
        day: i,
        date: dateStr,
        holiday: holiday,
        awayCount: awayCount,
        isToday: today.toDateString() === dateObj.toDateString(),
        isPast: dateObj < today 
      });
    }
  }

  private isDateInPeriod(target: Date, period: string): boolean {
    if (!period) return false;
    const parts = period.split(period.includes(' to ') ? ' to ' : ' - ');
    const start = new Date(parts[0]);
    const end = parts[1] ? new Date(parts[1]) : start;
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return target >= start && target <= end;
  }

  selectDay(day: any) {
    if (day.empty || day.isPast) return;
    const selectedDate = new Date(day.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    this.isNoticeWarning = diffDays < this.suggestedNoticeDays && diffDays >= 0;
    this.selectedDay = day;
    this.showModal = true;
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
    this.generateCalendar();
  }

  goToFiling(date: string) {
    this.router.navigate(['/file-leave'], { queryParams: { date } });
  }
}