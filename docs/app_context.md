# Breath Safe - App Context Documentation

## Project Overview

**Project Name**: Breath Safe - Air Quality Mobile App  
**Purpose**: A React TypeScript mobile application that tracks real-time air quality data using user location. Built with modern web technologies and best practices.

## Tech Stack

### Frontend Framework
- **React**: 18.3.1 (with React DOM 18.3.1)
- **TypeScript**: ^5.8.3
- **Build Tool**: Vite ^5.4.19
- **Development Server**: Vite dev server (port 8080, host "::")

### UI/UX Framework
- **Styling**: Tailwind CSS ^3.4.17 with custom design system
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Icons**: Lucide React ^0.462.0
- **Theme Management**: next-themes ^0.3.0 (dark/light mode support)
- **Animations**: tailwindcss-animate ^1.0.7

### State Management & Data
- **Global State**: Zustand ^5.0.7 with persistence and devtools
- **Data Fetching**: @tanstack/react-query ^5.83.0
- **Form Handling**: react-hook-form ^7.61.1 with @hookform/resolvers ^3.10.0
- **Validation**: Zod ^3.25.76

### Backend & Database
- **Backend**: Supabase (Database + Authentication + Edge Functions)
- **Database Client**: @supabase/supabase-js ^2.55.0
- **Authentication**: Supabase Auth with PKCE flow

### Routing & Navigation
- **Router**: react-router-dom ^6.30.1 with lazy loading and retry mechanisms

### Development Tools
- **Linting**: ESLint ^9.32.0 with TypeScript support
- **Code Quality**: Strict TypeScript configuration
- **Development**: Hot reload with React SWC plugin

## App Architecture

### Folder Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (35+ components)
│   ├── AirQualityDashboard.tsx
│   ├── Navigation.tsx
│   ├── GoogleMap.tsx
│   ├── ErrorBoundary/
│   └── ...
├── hooks/               # Custom React hooks
│   ├── useAuth.ts      # Authentication logic
│   ├── useAirQuality.ts # Air quality data fetching
│   ├── usePerformance.ts # Performance monitoring
│   └── ...
├── pages/               # Application pages (lazy loaded)
│   ├── Index.tsx       # Dashboard page
│   ├── Auth.tsx        # Authentication page
│   ├── Products.tsx    # Products page
│   ├── Rewards.tsx     # Rewards page
│   └── ...
├── integrations/        # External service integrations
│   └── supabase/       # Supabase client and types
├── services/           # API service layer
│   └── api.ts          # Generic API service with caching/retry
├── store/              # Zustand global state management
├── lib/                # Utility functions
├── types/              # TypeScript type definitions
└── config/             # Configuration files
```

### Component Architecture
- **Design System**: Custom Tailwind CSS configuration with AQI-specific colors
- **Component Library**: shadcn/ui components with Radix UI primitives
- **Error Handling**: Comprehensive error boundaries at multiple levels
- **Performance**: Lazy loading, code splitting, performance monitoring
- **Responsive**: Mobile-first design approach

## API Integrations

### OpenAQ API Integration
- **Base URL**: `https://api.openaq.org/`
- **API Versions Used**: 
  - Primary: v3 measurements and locations
  - Fallback: v2 measurements and cities
- **Authentication**: X-API-Key header
- **Environment Variable**: `OPENAQ_API_KEY` (stored in .env)
- **Rate Limiting**: Built-in caching (5-minute TTL) and error tracking
- **Fallback Strategy**: Multi-tier fallback system for reliability

#### Example API Calls:
```javascript
// v3 Measurements
https://api.openaq.org/v3/measurements?coordinates=${lat},${lon}&radius=10000&limit=100

// v3 Locations  
https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=50000&limit=10

// v2 Fallback
https://api.openaq.org/v2/measurements?coordinates=${lat},${lon}&radius=10000&limit=100
```

#### Required Headers:
```javascript
{
  'X-API-Key': process.env.OPENAQ_API_KEY,
  'Accept': 'application/json'
}
```

### Supabase Integration
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Email/password with PKCE flow
- **Edge Functions**: Air quality data processing (`get-air-quality`)
- **Real-time**: Subscriptions for live updates

## Global State Structure (Zustand)

### AppState Interface:
```typescript
interface AppState {
  // UI State
  isLoading: boolean;
  error: string | null;
  sidebarOpen: boolean;
  
  // User State  
  user: any | null;
  profile: any | null;
  
  // Air Quality State
  currentAQI: number | null;
  currentLocation: string | null;
  lastReading: any | null;
  
  // Cache State
  cache: { [key: string]: { data: any; timestamp: number; ttl: number; } };
}
```

### Persistence Configuration:
- **Storage**: localStorage with partial state persistence
- **Persisted Fields**: `sidebarOpen`, `currentLocation`
- **Store Name**: 'breath-safe-store'

## Database Schema (Supabase)

### Core Tables:
- **profiles**: User profiles with total_points
- **air_quality_readings**: Air quality measurements with location data
- **user_points**: Points history with AQI values
- **achievements**: Achievement definitions with criteria
- **user_achievements**: User-achievement relationships
- **affiliate_products**: Product recommendations
- **withdrawal_requests**: Currency withdrawal system

### Key Database Functions:
- **insert_air_quality_reading**: Secure function for saving readings
- **RLS Policies**: Row-level security for all tables

## Business Rules & Constraints

### Points System:
- Points earned automatically via database triggers based on reading count
- Currency conversion: $0.1 per 1000 points
- Minimum withdrawal: 500,000 points

### AQI Calculation:
- Primary calculation based on PM2.5 values
- EPA standard AQI scale (0-500)
- Color coding: Good (green) → Hazardous (red)

### Air Quality Categories:
- **Good**: 0-50 (Green)
- **Moderate**: 51-100 (Yellow)  
- **Unhealthy for Sensitive**: 101-150 (Orange)
- **Unhealthy**: 151-200 (Red)
- **Very Unhealthy**: 201-300 (Purple)
- **Hazardous**: 301+ (Dark Red)

### Location & Privacy:
- User consent required for location access
- Location permission stored in localStorage
- Fallback data provided when APIs fail
- Cache duration: 5 minutes for API responses

## Naming Conventions & Coding Standards

### TypeScript Configuration:
- **Strict Mode**: Enabled with comprehensive strict checks
- **Path Mapping**: `@/*` resolves to `./src/*`
- **No Implicit Any**: Enforced throughout codebase

### ESLint Rules:
- React Hooks rules enforced
- TypeScript explicit function return types (warn)
- Unused variables/parameters warnings
- React component export restrictions

### File Naming:
- **Components**: PascalCase (e.g., `AirQualityDashboard.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- **Pages**: PascalCase (e.g., `Index.tsx`)
- **Utils**: camelCase (e.g., `airQualityUtils.ts`)

### Component Patterns:
- **Error Boundaries**: Comprehensive error handling at multiple levels
- **Lazy Loading**: All pages lazy-loaded with retry mechanisms
- **Performance**: Built-in performance monitoring hooks
- **Caching**: Multi-level caching (Zustand + React Query + API service)

## Environment Variables

### Required Variables:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAQ API Configuration  
OPENAQ_API_KEY=your_openaq_api_key  # Server-side only

# Optional (currently unused)
VITE_OPENWEATHERMAP_API_KEY=your_openweathermap_api_key
```

### Deployment Environment:
- **Platform**: Netlify (primary deployment target)
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18+

## UI/UX Guidelines

### Design System:
- **Color Palette**: Custom CSS variables with AQI-specific colors
- **Typography**: System font stack with Tailwind utilities
- **Spacing**: Consistent spacing scale via Tailwind
- **Components**: shadcn/ui design system with custom extensions

### Custom CSS Variables:
```css
--aqi-good: hsl(var(--aqi-good))
--aqi-moderate: hsl(var(--aqi-moderate))  
--aqi-unhealthy-sensitive: hsl(var(--aqi-unhealthy-sensitive))
--aqi-unhealthy: hsl(var(--aqi-unhealthy))
--aqi-very-unhealthy: hsl(var(--aqi-very-unhealthy))
--aqi-hazardous: hsl(var(--aqi-hazardous))
```

### Responsive Design:
- **Mobile-First**: Primary target is mobile devices
- **Breakpoints**: Tailwind default breakpoints
- **Touch-Friendly**: Appropriate touch targets and gestures

## Dependencies & Versions

### Core Dependencies:
```json
{
  "react": "^18.3.1",
  "typescript": "^5.8.3", 
  "@supabase/supabase-js": "^2.55.0",
  "@tanstack/react-query": "^5.83.0",
  "zustand": "^5.0.7",
  "react-router-dom": "^6.30.1",
  "tailwindcss": "^3.4.17",
  "vite": "^5.4.19"
}
```

### UI Component Dependencies:
```json
{
  "@radix-ui/react-*": "^1.x.x",  # 20+ Radix UI components
  "lucide-react": "^0.462.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0"
}
```

## Known Limitations & Technical Debt

### Current Limitations:
1. **Hardcoded Fallback Values**: Some environmental data uses fallback values (temperature: 25°C, humidity: 60%)
2. **Estimated Pollutant Values**: PM1 and PM0.3 are estimated from PM2.5 rather than measured
3. **Location Accuracy**: Dependent on browser geolocation accuracy
4. **API Rate Limits**: OpenAQ API has rate limiting that could affect heavy usage

### Technical Debt:
1. **Error Handling**: Some areas could benefit from more granular error handling
2. **Testing**: Limited test coverage (testing framework not implemented)
3. **Performance**: Large component files (ProfileView.tsx: 1412 lines)
4. **Caching**: Multiple caching layers could be consolidated

### Browser Compatibility:
- **Target**: Modern browsers with ES2020 support
- **Geolocation**: Requires HTTPS for production use
- **Local Storage**: Required for authentication persistence

## Security Considerations

### Authentication Security:
- **PKCE Flow**: Secure authentication flow for public clients
- **Row Level Security**: Database-level access control
- **Token Storage**: Secure token storage in localStorage
- **Environment Variables**: Sensitive data properly externalized

### API Security:
- **API Keys**: Server-side storage for sensitive keys
- **CORS**: Proper CORS configuration for cross-origin requests
- **Rate Limiting**: Built-in rate limiting and error tracking

## Development Workflow

### Local Development:
```bash
npm install          # Install dependencies
npm run dev         # Start development server (port 8080)
npm run build       # Build for production  
npm run lint        # Run ESLint
npm run preview     # Preview production build
```

### Deployment Workflow:
1. Push changes to GitHub repository
2. Netlify automatically builds and deploys
3. Environment variables configured in Netlify dashboard
4. Live testing required (no local testing per user preference)

## Performance Monitoring

### Built-in Monitoring:
- **Performance Hooks**: Custom performance monitoring hooks
- **Error Tracking**: Comprehensive error boundaries with logging
- **Bundle Analysis**: Vite bundle analysis and code splitting
- **Lazy Loading**: Route-based and component-based lazy loading

### Cache Strategy:
- **API Service**: 5-minute TTL with retry mechanisms
- **Zustand**: Persistent state with selective serialization
- **React Query**: Stale-while-revalidate pattern
- **Browser**: localStorage for long-term persistence

---

**Last Updated**: Generated automatically from codebase analysis  
**Version**: Current main branch state  
**Maintainer**: Development team