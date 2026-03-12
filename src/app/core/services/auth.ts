import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: string;
  name: string;
  role: string;
  credits: { paidLeave: number; birthdayLeave: number; sickLeave: number; };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly REQ_KEY = 'cls_leave_requests';
  private readonly USER_KEY = 'cls_user_session';

  // These are your "Master" defaults
  private defaultUsers: User[] = [
    { id: 'OPS-STF', name: 'Reymart L. Prado', role: 'Ops Staff', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'OPS-SUP', name: 'Domingo N. Reantaso Jr.', role: 'Ops Sup', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'MGR-001', name: 'Roy Belen', role: 'Manager', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } },
    { id: 'HR-001', name: 'Rosalie Neptuno', role: 'HR', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } }
  ];

  private users: User[] = [...this.defaultUsers];

  private currentUserSubject = new BehaviorSubject<User | null>(this.getInitialUser());
  currentUser$ = this.currentUserSubject.asObservable();

  private requestsSubject = new BehaviorSubject<any[]>(this.getSavedRequests());
  requests$ = this.requestsSubject.asObservable();

  private getInitialUser(): User | null {
    const saved = localStorage.getItem(this.USER_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  private getSavedRequests(): any[] {
    const saved = localStorage.getItem(this.REQ_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  /**
   * RESET METHOD
   * Call this to clear all test data and fix negative balances
   */
  resetAllData() {
    localStorage.removeItem(this.REQ_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.requestsSubject.next([]);
    this.currentUserSubject.next(null);
    this.users = JSON.parse(JSON.stringify(this.defaultUsers));
    console.log('System Reset: LocalStorage cleared and users restored to default.');
  }

  login(id: string, pass: string): boolean {
    const user = this.users.find(u => u.id === id);
    if (user) {
      this.currentUserSubject.next({ ...user });
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }

  addRequest(newRequest: any) {
    const enriched = { 
      ...newRequest, 
      status: 'Pending', 
      requesterName: this.currentUserSubject.value?.name || 'Staff',
      targetReviewer: '' 
    };
    
    const updated = [enriched, ...this.requestsSubject.value];
    this.saveRequests(updated);
  }

  updateRequestStatus(requestToUpdate: any, action: 'Approved' | 'Rejected') {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return;

    const updated = this.requestsSubject.value.map(req => {
      if (req.dateFiled === requestToUpdate.dateFiled && req.requesterName === requestToUpdate.requesterName) {
        if (action === 'Rejected') {
          return { ...req, status: 'Rejected', targetReviewer: currentUser.role };
        }

        if (currentUser.role.includes('Sup')) {
          return { ...req, status: 'Awaiting HR Approval', targetReviewer: currentUser.role };
        } 
        else if (currentUser.role === 'HR' || currentUser.role === 'Manager') {
          this.deductCredits(req.requesterName, req.type, req.period);
          return { ...req, status: 'Approved', targetReviewer: currentUser.role };
        }
      }
      return req;
    });

    this.saveRequests(updated);
  }

  private deductCredits(userName: string, leaveType: string, period: string) {
    const user = this.users.find(u => u.name === userName);
    if (!user) return;

    // Fixed mapping to match your UI strings exactly
    const typeMap: { [key: string]: keyof User['credits'] } = {
      'Paid Leave': 'paidLeave',
      'Sick Leave': 'sickLeave',
      'Birthday Leave': 'birthdayLeave'
    };

    const creditKey = typeMap[leaveType];
    if (creditKey) {
      // Calculate duration to deduct the correct amount
      let daysToDeduct = 1;
      if (period && period.includes(' - ')) {
        const dates = period.split(' - ');
        const start = new Date(dates[0]);
        const end = new Date(dates[1]);
        const diff = Math.abs(end.getTime() - start.getTime());
        daysToDeduct = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
      }

      // Safeguard: Never drop below zero
      user.credits[creditKey] = Math.max(0, user.credits[creditKey] - daysToDeduct);

      if (this.currentUserSubject.value?.name === userName) {
        this.currentUserSubject.next({ ...user });
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    }
  }

  private saveRequests(requests: any[]) {
    this.requestsSubject.next(requests);
    localStorage.setItem(this.REQ_KEY, JSON.stringify(requests));
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.USER_KEY);
  }
}