import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
// Import the utility from its new location
import { calculateWorkdays } from '../utils/workday-calculator.util';

export interface Attachment {
  name: string;
  data: string;
  type: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  birthDate: string; 
  credits: { 
    paidLeave: number; 
    birthdayLeave: number; 
    sickLeave: number; 
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly REQ_KEY = 'cls_leave_requests';
  private readonly USER_KEY = 'cls_user_session';
  private readonly USERS_DB_KEY = 'cls_users_database';

  private defaultUsers: User[] = [
    { id: 'OPS-ADM-STF', name: 'Reymart L. Prado', role: 'Operations Staff', department: 'Operations', birthDate: '1998-03-15', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'OPS-ADM-SUP', name: 'Domingo N. Reantaso Jr.', role: 'Ops Supervisor', department: 'Operations', birthDate: '1985-06-22', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'ACC-SUP', name: 'Olympia B. Oreste', role: 'Acc Supervisor', department: 'Accounts', birthDate: '1990-11-05', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } },
    { id: 'ADM-MGR', name: 'Riza Jane A. Amoncio', role: 'Admin Manager', department: 'Administration', birthDate: '1995-03-20', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } },
    { id: 'HR-001', name: 'Rosalie Neptuno', role: 'HR', department: 'HR', birthDate: '1992-01-10', credits: { paidLeave: 18, birthdayLeave: 1, sickLeave: 12 } },
    { id: 'CLS-ACC', name: 'Accounts Employee', role: 'Accounts Staff', department: 'Accounts', birthDate: '1997-08-30', credits: { paidLeave: 15, birthdayLeave: 1, sickLeave: 10 } },
    { id: 'CLS-DEV', name: 'Developer', role: 'It Developer', department: 'IT', birthDate: '1994-03-01', credits: { paidLeave: 30, birthdayLeave: 1, sickLeave: 20 } },
    { id: 'MGR-001', name: 'Roy Belen', role: 'Manager', department: 'Management', birthDate: '1980-12-25', credits: { paidLeave: 20, birthdayLeave: 1, sickLeave: 15 } }
  ];

  private usersDatabase: User[] = [];
  private usersDatabaseSubject = new BehaviorSubject<User[]>([]);
  usersDatabase$ = this.usersDatabaseSubject.asObservable();

  public currentUserSubject = new BehaviorSubject<User | null>(this.getInitialUser());
  currentUser$ = this.currentUserSubject.asObservable();
  
  private requestsSubject = new BehaviorSubject<any[]>(this.getSavedRequests());
  requests$ = this.requestsSubject.asObservable();

  constructor() {
    this.loadUsersDatabase();
  }

  private loadUsersDatabase() {
    const saved = localStorage.getItem(this.USERS_DB_KEY);
    if (saved) {
      this.usersDatabase = JSON.parse(saved);
    } else {
      this.usersDatabase = [...this.defaultUsers];
      this.saveUsersDatabase();
    }
    this.usersDatabaseSubject.next(this.usersDatabase);
  }

  private saveUsersDatabase() {
    localStorage.setItem(this.USERS_DB_KEY, JSON.stringify(this.usersDatabase));
  }

  private getInitialUser(): User | null {
    const saved = localStorage.getItem(this.USER_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch { return null; }
  }

  private getSavedRequests(): any[] {
    const saved = localStorage.getItem(this.REQ_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  login(id: string, pass: string): boolean {
    const cleanId = id.trim().toUpperCase();
    const user = this.usersDatabase.find(u => u.id.toUpperCase() === cleanId);
    if (user) {
      this.currentUserSubject.next({ ...user });
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(this.USER_KEY);
  }

  addRequest(newRequest: any) {
    const user = this.currentUserSubject.value;
    if (!user) return;

    // Refined Reviewer Mapping
    const reviewerMap: { [key: string]: string } = {
      'Operations Staff': 'Ops Supervisor',
      'Accounts Staff': 'Acc Supervisor',
      'Ops Supervisor': 'Admin Manager',
      'Acc Supervisor': 'Admin Manager',
      'It Developer': 'Admin Manager',
      'HR': 'Admin Manager',
      'Admin Manager': 'HR'
    };

    const firstReviewer = reviewerMap[user.role] || 'HR';

    const enriched = { 
      ...newRequest, 
      id: Date.now(), 
      status: 'Pending', 
      employeeName: user.name,
      companyId: user.id,
      role: user.role,
      department: user.department,
      targetReviewer: firstReviewer,
      dateFiled: new Date().toISOString()
    };
    
    const updated = [enriched, ...this.requestsSubject.value];
    this.saveRequests(updated);
  }

  updateRequestStatus(requestId: number, action: string) {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) return;

    const updated = this.requestsSubject.value.map(req => {
      if (req.id === requestId) {
        if (action === 'Reject') return { ...req, status: 'Rejected', targetReviewer: 'None' };

        if (currentUser.role === 'Admin Manager') {
          if (req.role === 'HR') {
            this.deductCredits(req.companyId, req.type, req.period);
            return { ...req, status: 'Approved', targetReviewer: 'None' };
          }
          return { ...req, status: 'Awaiting HR Approval', targetReviewer: 'HR' };
        }

        if (currentUser.role === 'HR') {
          this.deductCredits(req.companyId, req.type, req.period);
          return { ...req, status: 'Approved', targetReviewer: 'None' };
        }

        if (['Ops Supervisor', 'Acc Supervisor'].includes(currentUser.role)) {
          return { ...req, status: 'Awaiting HR Approval', targetReviewer: 'HR' };
        }
      }
      return req;
    });

    this.saveRequests(updated);
  }

  private deductCredits(userId: string, leaveType: string, period: string) {
    const user = this.usersDatabase.find(u => u.id === userId);
    if (!user) return;

    // Fetch holidays from localStorage to skip them in calculation
    const holidayList = JSON.parse(localStorage.getItem('company_holidays') || '[]');
    const daysToDeduct = calculateWorkdays(period, holidayList);

    const typeMap: { [key: string]: keyof User['credits'] } = {
      'Paid Leave': 'paidLeave',
      'Sick Leave': 'sickLeave',
      'Birthday Leave': 'birthdayLeave'
    };

    const creditKey = typeMap[leaveType];
    if (creditKey) {
      user.credits[creditKey] = Math.max(0, user.credits[creditKey] - daysToDeduct);
      this.saveUsersDatabase();

      if (this.currentUserSubject.value?.id === userId) {
        this.currentUserSubject.next({ ...user });
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      }
    }
  }

  private saveRequests(requests: any[]) {
    this.requestsSubject.next(requests);
    localStorage.setItem(this.REQ_KEY, JSON.stringify(requests));
  }

  getRequestsSync(): any[] {
    return this.requestsSubject.value;
  }
}