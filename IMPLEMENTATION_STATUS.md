# Mökki Mobile App - Implementation Status

## Overview

React Native (Expo) mobile app for Mökki, porting the Next.js web app functionality. Uses the same Supabase backend.

**Last Updated:** December 10, 2025

---

## Phase 1: Foundation (COMPLETE)

### Authentication
- [x] Supabase client with expo-secure-store for token persistence
- [x] Login screen with email/password
- [x] Sign-up screen
- [x] Forgot password flow
- [x] Auth context with session management
- [x] Protected route redirects

### Theming
- [x] Theme provider with light/dark/system modes
- [x] Color system matching web app (HSL-based)
- [x] Custom fonts: Chillax (UI), Boska (navigation)
- [x] Theme persistence

### UI Components
- [x] Card, CardHeader, CardTitle, CardDescription, CardContent
- [x] Button (with loading state)
- [x] Input
- [x] Label
- [x] GeometricBackground (animated mountains)

### Navigation
- [x] Expo Router setup
- [x] Tab navigation (Home, Calendar, Expenses, B-Roll, Account)
- [x] Auth flow routing

---

## Phase 2: House Management (COMPLETE)

### House API Layer (`lib/api/house.ts`)
- [x] `getUserHouses(userId?)` - fetch user's houses from Supabase
- [x] `getActiveHouse(userId?)` - get active house with fallback to first
- [x] `getActiveHouseId()` / `setActiveHouseId()` - AsyncStorage persistence
- [x] `createHouse(name)` - create new house
- [x] `acceptAllPendingInvites(userId?, email?)` - auto-accept pending invites
- [x] Fixed auth race condition by passing userId from context

### House Context (`lib/context/house.tsx`)
- [x] HouseProvider with state management
- [x] `activeHouse`, `houses`, `isLoading`, `error` state
- [x] `setActiveHouse()`, `refreshHouses()` actions
- [x] Auto-fetch on auth state change

### Top Bar (`components/TopBar.tsx`)
- [x] Layout: Snow toggle + Theme switcher (top right)
- [x] Layout: "MÖKKI | [House Name]" (bottom left)
- [x] Safe area insets for notch
- [x] Backdrop blur effect

### House Switcher (`components/HouseSwitcher.tsx`)
- [x] Dropdown showing current house name with chevron
- [x] Modal with all user's houses
- [x] Checkmark indicator for active house
- [x] "Create New House" option
- [x] Updates context + AsyncStorage on selection

### Theme Switcher (`components/ThemeSwitcher.tsx`)
- [x] Icon button (sun/moon/laptop)
- [x] Modal with Light/Dark/System options
- [x] Integrates with ThemeProvider

### Snow Toggle (`components/SnowToggle.tsx`)
- [x] Placeholder button (snowflake icon)
- [ ] Actual snow animation (future)

### Create House Screen (`app/create-house.tsx`)
- [x] Form with house name input
- [x] Creates house via API
- [x] Sets as active house
- [x] Redirects to dashboard

### Dashboard Updates (`app/(tabs)/index.tsx`)
- [x] TopBar integration
- [x] Dynamic house name from context
- [x] Loading state while fetching
- [x] Navigation links in mountain area

---

## Phase 3: Calendar & Stays (NOT STARTED)

### Calendar View
- [ ] Monthly calendar component
- [ ] Date range selection for stays
- [ ] Visual indicators for booked dates

### Stays API
- [ ] `getStays(houseId, dateRange)` - fetch stays
- [ ] `createStay(houseId, dates, userId)` - book a stay
- [ ] `updateStay(stayId, dates)` - modify stay
- [ ] `deleteStay(stayId)` - cancel stay

### Stay Management
- [ ] Book stay modal/screen
- [ ] View upcoming stays
- [ ] Edit/cancel stays
- [ ] Conflict detection

---

## Phase 4: Expenses (NOT STARTED)

### Expense List
- [ ] List view of house expenses
- [ ] Filter by category, date, status
- [ ] Total/balance summary

### Expense API
- [ ] `getExpenses(houseId)` - fetch expenses
- [ ] `createExpense(houseId, data)` - add expense
- [ ] `updateExpense(expenseId, data)` - edit expense
- [ ] `deleteExpense(expenseId)` - remove expense

### Expense Management
- [ ] Add expense form
- [ ] Receipt photo upload
- [ ] Split calculation
- [ ] Settlement tracking

---

## Phase 5: Bulletin Board (NOT STARTED)

- [ ] House notes/announcements
- [ ] Pin important items
- [ ] Add/edit/delete notes

---

## Phase 6: Weather & Snow (NOT STARTED)

- [ ] Resort weather integration
- [ ] Snow report display
- [ ] Snow animation toggle (SnowToggle component ready)

---

## Phase 7: B-Roll Gallery (NOT STARTED)

- [ ] Photo grid view
- [ ] Upload photos from device
- [ ] View fullscreen
- [ ] Delete photos

---

## Phase 8: Profile & Account (NOT STARTED)

- [ ] View/edit profile
- [ ] Change password
- [ ] Notification preferences
- [ ] Sign out (currently on home screen)

---

## Phase 9: Member Management (NOT STARTED)

- [ ] View house members
- [ ] Invite new members
- [ ] Remove members (admin only)
- [ ] Role management

---

## Technical Notes

### Key Files
```
lib/
├── api/
│   └── house.ts          # House CRUD operations
├── context/
│   ├── auth.tsx          # Auth state management
│   ├── house.tsx         # House state management
│   └── theme.tsx         # Theme state management
└── supabase/
    └── client.ts         # Supabase client setup

components/
├── ui/                   # Reusable UI components
├── TopBar.tsx            # Top navigation bar
├── HouseSwitcher.tsx     # House dropdown
├── ThemeSwitcher.tsx     # Theme toggle
├── SnowToggle.tsx        # Snow animation toggle
└── GeometricBackground.tsx # Animated mountains

app/
├── _layout.tsx           # Root layout with providers
├── create-house.tsx      # New house creation
├── (auth)/               # Auth screens
└── (tabs)/               # Main app screens
```

### Known Issues (Resolved)
- **Auth race condition**: `supabase.auth.getUser()` returning null when called immediately after auth context updates. Fixed by passing userId from context to API functions.

### Dependencies
- `@react-native-async-storage/async-storage` - Active house persistence
- `@supabase/supabase-js` - Database client
- `expo-secure-store` - Secure token storage
- `expo-router` - File-based navigation
- `react-native-reanimated` - Animations

---

## Next Steps (Recommended Order)

1. **Calendar & Stays** - Core functionality, high user value
2. **Expenses** - Second most used feature
3. **B-Roll Gallery** - Media upload/viewing
4. **Weather/Snow** - External API integration
5. **Bulletin Board** - Simple CRUD
6. **Profile/Account** - Settings cleanup
7. **Member Management** - Admin features
