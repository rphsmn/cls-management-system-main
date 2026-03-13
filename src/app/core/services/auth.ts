import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Attachment {
  name: string;
  data: string; // Base64 String
  type: string;
}

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

  private defaultUsers: User[] = [
    { id: 'OPS-STF', name: 'Reymart L. Prado', role: 'Ops Staff', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'OPS-SUP', name: 'Domingo N. Reantaso Jr.', role: 'Ops Sup', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'MGR-001', name: 'Roy Belen', role: 'Manager', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } },
    { id: 'HR-001', name: 'Rosalie Neptuno', role: 'HR', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } }
  ];

  private users: User[] = [...this.defaultUsers];

  public currentUserSubject = new BehaviorSubject<User | null>(this.getInitialUser());
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

  resetAllData() {
    localStorage.removeItem(this.REQ_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.requestsSubject.next([]);
    this.currentUserSubject.next(null);
    this.users = JSON.parse(JSON.stringify(this.defaultUsers));
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
    const user = this.currentUserSubject.value;
    const enriched = { 
      ...newRequest, 
      id: Date.now(), // Fixed: Unique ID for precise matching
      status: 'Pending', 
      employeeName: user?.name || 'Staff',
      companyId: user?.id || 'N/A',
      targetReviewer: 'Supervisor' 
    };
    
    const updated = [enriched, ...this.requestsSubject.value];
    this.saveRequests(updated);
  }

  updateRequestStatus(requestId: number, action: string) {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return;

    const updated = this.requestsSubject.value.map(req => {
      if (req.id === requestId) {
        if (action === 'Reject') {
          return { ...req, status: 'Rejected', targetReviewer: 'None' };
        }

        if (currentUser.role === 'Ops Sup' || currentUser.role === 'Supervisor') {
          return { ...req, status: 'Awaiting HR Approval', targetReviewer: 'HR' };
        } 
        
        else if (currentUser.role === 'HR' || currentUser.role === 'Manager') {
          this.deductCredits(req.employeeName, req.type, req.period);
          return { ...req, status: 'Approved', targetReviewer: 'None' };
        }
      }
      return req;
    });

    this.saveRequests(updated);
  }

  private deductCredits(userName: string, leaveType: string, period: string) {
    const user = this.users.find(u => u.name === userName);
    if (!user) return;

    const typeMap: { [key: string]: keyof User['credits'] } = {
      'Paid Leave': 'paidLeave',
      'Sick Leave': 'sickLeave',
      'Birthday Leave': 'birthdayLeave'
    };

    const creditKey = typeMap[leaveType];
    if (creditKey) {
      let daysToDeduct = 1;
      if (period && period.includes(' - ')) {
        const dates = period.split(' - ');
        const start = new Date(dates[0]);
        const end = new Date(dates[1]);
        const diff = Math.abs(end.getTime() - start.getTime());
        daysToDeduct = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
      }
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