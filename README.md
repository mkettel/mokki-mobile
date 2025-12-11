# Mokki Mobile

React Native mobile app for Mokki - the ski house management platform.

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on your phone for testing

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Supabase credentials:
```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

3. Start the development server:
```bash
npm run start
```

4. Press `i` for iOS simulator, `a` for Android, or scan QR code with Expo Go.

## Project Structure

```
mokki-mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Home/Dashboard
│   │   ├── calendar.tsx   # Calendar & stays
│   │   ├── expenses.tsx   # Expense tracking
│   │   ├── broll.tsx      # Media gallery
│   │   └── account.tsx    # User profile
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
├── constants/             # App constants
├── lib/                   # Utilities and services
│   ├── supabase/         # Supabase client
│   └── context/          # React context providers
└── types/                # TypeScript types
```

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Supabase (shared with web app)
- **Auth**: Supabase Auth with expo-secure-store
- **Styling**: React Native StyleSheet

## Development Phases

- **Phase 1** (Complete): Foundation & Authentication
- **Phase 2**: House Management & Dashboard
- **Phase 3**: Calendar & Stays
- **Phase 4**: Expense Tracking
- **Phase 5-10**: Additional features

## Shared Backend

This app connects to the same Supabase backend as the web app (`mokki/`):
- Same database
- Same auth system
- Same storage buckets
- Users can use either platform interchangeably

## Scripts

- `npm start` - Start Expo dev server
- `npm run ios` - Start iOS simulator
- `npm run android` - Start Android emulator
- `npm run web` - Start web version
