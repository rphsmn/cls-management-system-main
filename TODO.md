# TODO: Fix Code Errors

## ✅ COMPLETED - All 7 errors have been fixed!

### Fix 1: Import path for HistoryComponent in app.routes.ts
- ✅ Changed `'./features/leave/history/history'` to `'./features/leave/history/history.component'`

### Fix 2: Import path for dashboard.ts
- ✅ Fixed import from `'../auth/auth'` to `'../../core/services/auth'`
- ✅ Added separate import for User from `'../../core/models/user.model'`

### Fix 3: Import path for approvals.ts
- ✅ Fixed import from `'../auth/auth'` to `'../../core/services/auth'`
- ✅ Added import for User from `'../../core/models/user.model'`
- ✅ Added explicit type `(user: User | null)` to subscription

### Fix 4-7: Previous fixes (consolidated)
- ✅ Removed duplicate `User` interface from auth.ts - now imports from `../models/user.model`
- ✅ Fixed history.component.ts import path to use `'../../../core/services/auth'`
- ✅ Changed `password: string` to `password?: string` in user.model.ts
- ✅ Fixed auth.guard.ts import path `'../services/auth'`

### Result
- ✅ Build successful - Application bundle generation complete

