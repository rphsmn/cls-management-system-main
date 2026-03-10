export interface User {
  id: string;
  name: string;
  password?: string;
  role:
    | 'Employee'
    | 'Manager'
    | 'HR'
    | 'Admin Manager'
    | 'Ops Sup'
    | 'Ops Staff'
    | 'Acc Staff'
    | 'Acc Sup'
    | 'IT Dev';
  credits: {
    paidLeave: number;
    birthdayLeave: number;
    sickLeave: number;
  };
}
