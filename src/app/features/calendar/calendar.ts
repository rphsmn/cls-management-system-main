import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms'; 
import { AuthService, User } from '../../core/services/auth';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './calendar.html',
  styleUrls: ['./calendar.css']
})
export class CalendarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);
  
  private subscriptions = new Subscription();

  currentDate = new Date();
  days: any[] = [];
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  years: number[] = [];
  
  selectedDay: any = null;
  showModal = false;
  isNoticeWarning = false;
  suggestedNoticeDays = 3;
  isLoading = false; 

  isHR = false; 
  newEventName = '';

  holidays: any[] = [];
  private holidayCache: { [year: number]: any[] } = {}; 

  ngOnInit() {
    this.generateYearOptions();
    
    this.subscriptions.add(
      this.authService.currentUser$.subscribe((user: User | null) => {
        if (user) {
          this.isHR = user.role === 'HR' || user.role === 'Admin Manager';
          this.fetchHolidays(this.currentDate.getFullYear());
        }
      })
    );

    this.subscriptions.add(
      this.authService.requests$.subscribe(() => {
        this.generateCalendar();
        this.cd.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    this.years = [];
    for (let i = currentYear; i <= currentYear + 10; i++) {
      this.years.push(i);
    }
  }

  fetchHolidays(year: number) {
    this.isLoading = true;
    const phApi = `https://date.nager.at/api/v3/PublicHolidays/${year}/PH`;
    const auApi = `https://date.nager.at/api/v3/PublicHolidays/${year}/AU`;
    
    forkJoin([
      this.http.get<any[]>(phApi).pipe(catchError(() => of([]))),
      this.http.get<any[]>(auApi).pipe(catchError(() => of([])))
    ]).subscribe({
      next: ([phData, auData]) => {
        const processedPH = phData.map(h => ({
          date: h.date,
          name: h.name, 
          region: 'ph',
          type: this.mapHolidayType(h.name, 'ph')
        }));

        const processedAU = auData.map(h => ({
          date: h.date,
          name: h.name,
          region: 'au',
          type: this.mapHolidayType(h.name, 'au')
        }));

        const apiHolidays = this.mergeHolidays(processedPH, processedAU);
        
        // Retrieve locally stored events
        const saved = localStorage.getItem('company_events');
        const persistedEvents = saved ? JSON.parse(saved) : [];
        
        this.holidays = [...apiHolidays, ...persistedEvents];
        this.holidayCache[year] = this.holidays;
        this.isLoading = false;
        this.generateCalendar();
        this.cd.detectChanges(); 
      }
    });
  }

  addCompanyEvent() {
    if (!this.newEventName || !this.selectedDay) return;

    const newEvent = {
      date: this.selectedDay.date,
      name: this.newEventName,
      type: 'company-event'
    };

    this.holidays.push(newEvent);
    
    const toSave = this.holidays.filter(h => h.type === 'company-event');
    localStorage.setItem('company_events', JSON.stringify(toSave));

    this.generateCalendar();
    this.showModal = false;
    this.newEventName = '';
    this.cd.detectChanges();
  }

  removeCompanyEvent() {
    const confirmDelete = confirm(`Are you sure you want to remove "${this.selectedDay.holiday.name}"?`);
    if (confirmDelete) {
      this.holidays = this.holidays.filter(h => 
        !(h.date === this.selectedDay.date && h.name === this.selectedDay.holiday.name)
      );

      const toSave = this.holidays.filter(h => h.type === 'company-event');
      localStorage.setItem('company_events', JSON.stringify(toSave));

      this.generateCalendar();
      this.showModal = false;
      this.cd.detectChanges();
    }
  }

  private mapHolidayType(name: string, region: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('edsa') || lowerName.includes('remembrance')) return 'special-work';
    if (lowerName.includes('ninoy') || lowerName.includes('all saints') || 
        lowerName.includes('chinese new year') || lowerName.includes('black saturday')) {
      return 'special-non';
    }
    return 'regular';
  }

  private mergeHolidays(ph: any[], au: any[]): any[] {
    const combined = [...ph];
    au.forEach(auH => {
      const existing = combined.find(h => h.date === auH.date);
      if (existing) {
        existing.region = 'both';
        existing.name = `${existing.name} / ${auH.name}`;
      } else {
        combined.push(auH);
      }
    });
    return combined;
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allRequests = this.authService.getRequestsSync();
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
    const sep = period.includes(' to ') ? ' to ' : ' - ';
    const parts = period.split(sep);
    const start = new Date(parts[0]);
    const end = parts[1] ? new Date(parts[1]) : start;
    start.setHours(0,0,0,0);
    end.setHours(23,59,59,999);
    return target >= start && target <= end;
  }

  selectDay(day: any) {
    if (day.empty || (day.isPast && !this.isHR)) return;
    this.selectedDay = day;
    const selectedDate = new Date(day.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    this.isNoticeWarning = diffDays < this.suggestedNoticeDays && diffDays >= 0;
    this.showModal = true;
  }

  prevMonth() { 
    const oldYear = this.currentDate.getFullYear();
    this.currentDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() - 1)); 
    this.checkYearAndRefresh(oldYear);
  }

  nextMonth() { 
    const oldYear = this.currentDate.getFullYear();
    this.currentDate = new Date(this.currentDate.setMonth(this.currentDate.getMonth() + 1)); 
    this.checkYearAndRefresh(oldYear);
  }

  goToToday() { 
    const oldYear = this.currentDate.getFullYear();
    this.currentDate = new Date(); 
    this.checkYearAndRefresh(oldYear);
  }

  changeYear(event: any) { 
    const newYear = parseInt(event.target.value);
    this.currentDate = new Date(this.currentDate.setFullYear(newYear)); 
    this.fetchHolidays(newYear);
  }

  private checkYearAndRefresh(oldYear: number) {
    if (this.currentDate.getFullYear() !== oldYear) {
      this.fetchHolidays(this.currentDate.getFullYear());
    } else {
      this.generateCalendar();
      this.cd.detectChanges();
    }
  }

  goToFiling(date: string) { 
    this.router.navigate(['/file-leave'], { queryParams: { date } }); 
  }
}