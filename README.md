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

- **Phase 1**: Foundation & Authentication
- **Phase 2**: House Management & Dashboard
- **Phase 3**: Calendar & Stays
- **Phase 4** (complete): Expense Tracking
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

## Building & Deploying to TestFlight

### Prerequisites

- Apple Developer account ($99/year)
- Expo account (free) - create at expo.dev

### First-Time Setup

1. Login to Expo:

```bash
npx eas-cli login
```

2. Configure EAS Build (creates eas.json):

```bash
npx eas-cli build:configure
```

### Building & Submitting

**Full Build** (current approach):

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

This creates a complete new app binary and submits to TestFlight. Takes ~15-20 minutes for the build, then 5-10 minutes for Apple processing.

**Note on External TestFlight Review:**
- First build sent to external testers requires Apple review (24-48 hours)
- Subsequent builds are available within minutes after Apple processing

### Future: OTA Updates

Currently, all changes require a full build. In the future, we can set up **OTA (over-the-air) updates** using `expo-updates` for faster deployment of JS-only changes:

```bash
# After expo-updates is configured:
eas update --branch production
```

This would allow instant updates (~1-2 minutes) for UI changes, bug fixes, and new screens without going through TestFlight. Native module changes would still require a full build.

**To enable OTA updates later:**
1. Install expo-updates: `npx expo install expo-updates`
2. Configure in app.json with update URL
3. Build a new TestFlight version with expo-updates enabled
4. Then `eas update` will push to existing installs

For now, stick with full builds until the app stabilizes.
