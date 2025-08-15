# Breath Safe - App Context Documentation

## Project Overview

**Project Name**: Breath Safe  
**Purpose**: A real-time air quality monitoring application that provides users with location-based air quality data, tracks their environmental awareness through a points system, and offers rewards for engagement.

**Core Features**:
- Real-time air quality monitoring using geolocation
- User authentication and profile management
- Points and achievements system
- Currency rewards and withdrawal functionality
- Air quality data visualization and pollutant details
- Mobile-responsive design with PWA capabilities

## Tech Stack

### Frontend Framework
- **React 18.3.1** - Component-based UI framework
- **TypeScript 5.8.3** - Type-safe JavaScript
- **Vite 5.4.19** - Fast build tool and dev server

### Styling & UI
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
  - Complete suite of UI components (accordion, alert-dialog, avatar, etc.)
- **Lucide React** - Icon library
- **Custom AQI color system** - Air quality index specific styling

### State Management
- **Zustand 5.0.7** - Lightweight state management with persistence
- **React Query (TanStack) 5.83.0** - Server state management and caching

### Backend & Database
- **Supabase 2.55.0** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Edge Functions
  - Real-time subscriptions

### Routing & Navigation
- **React Router DOM 6.30.1** - Client-side routing

### Forms & Validation
- **React Hook Form 7.61.1** - Form handling
- **Zod 3.25.76** - Schema validation
- **Hookform Resolvers 3.10.0** - Form validation integration

### Build & Development
- **Vite** - Build tool with SWC for fast compilation
- **ESLint** - Code linting
- **PostCSS & Autoprefixer** - CSS processing

## App Architecture

### Folder Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (Radix UI based)
│   ├── ErrorBoundary/   # Error handling
│   └── *.tsx           # Feature components
├── hooks/               # Custom React hooks
├── pages/               # Route components
├── services/            # API services and external integrations
├── store/               # Zustand store configuration
├── integrations/        # Third-party integrations
│   └── supabase/       # Supabase client and types
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
└── config/             # Configuration files

supabase/
├── functions/          # Edge functions
│   └── get-air-quality/# OpenAQ API integration
└── migrations/         # Database migrations
```

### Component Architecture
- **Atomic Design Principles**: Base UI components in `components/ui/`
- **Feature Components**: Composed components for specific features
- **Page Components**: Route-level components
- **Custom Hooks**: Reusable logic for data fetching and state management

## API Integrations

### OpenAQ API
**Primary Data Source**: OpenAQ API for real-time air quality data

**Configuration**:
- API Key stored as environment variable: `OPENAQ_API_KEY`
- Accessed through Supabase Edge Function at `supabase/functions/get-air-quality/`
- Headers: `X-API-Key: ${OPENAQ_API_KEY}`

**API Endpoints Used**:
1. **Primary**: `https://api.openaq.org/v3/measurements` - Current measurements
2. **Secondary**: `https://api.openaq.org/v3/locations` - Location data
3. **Fallback**: `https://api.openaq.org/v2/measurements` - Legacy API
4. **Location**: `https://api.openaq.org/v2/cities` - Reverse geocoding

**Authentication**:
```javascript
headers: {
  'X-API-Key': OPENAQ_API_KEY,
  'Content-Type': 'application/json'
}
```

**Example Working Queries**:
```javascript
// Get measurements by coordinates
https://api.openaq.org/v3/measurements?coordinates=${lat},${lon}&radius=10000&limit=100

// Get locations by coordinates  
https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=50000&limit=10

// Get city info (reverse geocoding)
https://api.openaq.org/v2/cities?coordinates=${lat},${lon}&radius=1000&limit=1
```

**Response Handling**:
- Comprehensive fallback system (v3 → v2 → synthetic data)
- Error handling with retry logic
- Data transformation for consistent internal format

## App State Structure

### Zustand Store (`src/store/index.ts`)
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
  cache: {
    [key: string]: {
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}
```

**Persistence**: 
- `sidebarOpen` and `currentLocation` persist in localStorage
- Store name: `breath-safe-store`

### React Query State
- **Query Keys**: Feature-based (e.g., `['airQuality', hasUserConsent]`)
- **Cache Configuration**: 5-minute TTL, smart invalidation
- **Background Refresh**: Enabled for authenticated users

## Database Schema (Supabase)

### Core Tables
1. **profiles** - User profile information
2. **air_quality_readings** - Historical air quality data
3. **user_points** - Points tracking history
4. **achievements** - Available achievements
5. **user_achievements** - User achievement progress
6. **user_streaks** - Activity streaks
7. **withdrawal_requests** - Currency withdrawal requests
8. **affiliate_products** - Store products
9. **pollutant_details** - Pollutant information

### Key Relationships
- Users → Profiles (1:1)
- Users → Air Quality Readings (1:many)
- Users → User Points (1:many)
- Users → User Achievements (1:many)
- Achievements → User Achievements (1:many)

## Business Rules & Constraints

### Location & Privacy
- **User Consent Required**: Explicit permission for geolocation
- **Permission Storage**: `breath-safe-location-permission` in localStorage
- **Data Retention**: Location data not permanently stored
- **Geolocation Timeout**: 30 seconds on mobile devices

### Points System
- **Points Calculation**: Based on AQI readings and user engagement
- **Conversion Rate**: Points to currency rewards (varies)
- **Withdrawal Threshold**: Minimum threshold for cash withdrawals
- **Methods**: PayPal and M-Pesa supported

### Data Refresh
- **Auto Refresh**: Every 2 minutes for authenticated users
- **Manual Refresh**: User-initiated with geolocation re-permission
- **Cache Strategy**: 5-minute client cache, server-side caching in edge function

### Error Handling
- **Graceful Degradation**: Fallback data when APIs fail
- **User Feedback**: Toast notifications for errors
- **Retry Logic**: Automatic retries with exponential backoff

## Naming Conventions

### Components
- **PascalCase**: `AirQualityDashboard.tsx`
- **Descriptive Names**: Feature-based naming
- **UI Components**: Prefixed location in `components/ui/`

### Functions & Variables
- **camelCase**: `useAirQuality`, `fetchAirQualityData`
- **Descriptive**: Clear intent and purpose
- **Boolean Flags**: `hasUserConsent`, `isLoading`, `canWithdraw`

### Files & Directories
- **kebab-case**: For file names where appropriate
- **camelCase**: For TypeScript/JavaScript files
- **Descriptive**: Feature or purpose-based naming

### CSS Classes
- **Tailwind Utilities**: Primary styling approach
- **BEM**: When custom CSS is needed
- **AQI-Specific**: Custom CSS variables for air quality colors

## Coding Standards

### TypeScript
- **Strict Mode**: Enabled with comprehensive type checking
- **Interface Definitions**: All data structures typed
- **Generic Types**: Used for reusable API functions
- **Null Safety**: Explicit handling of nullable values

### React Patterns
- **Functional Components**: Hooks-based architecture
- **Custom Hooks**: Reusable logic extraction
- **Props Interface**: All component props typed
- **Error Boundaries**: Component-level error handling

### State Management
- **Zustand Store**: Global state for app-wide data
- **React Query**: Server state and caching
- **Local State**: Component-specific state with useState
- **Form State**: React Hook Form for complex forms

### Performance
- **Debouncing**: User input and API calls
- **Throttling**: Location updates and refreshes
- **Memoization**: Expensive calculations cached
- **Code Splitting**: Route-based lazy loading

## UI/UX Guidelines

### Design System
- **Color Palette**: AQI-specific color coding
  - Good: Green (#10B981)
  - Moderate: Yellow (#F59E0B)
  - Unhealthy for Sensitive: Orange (#F97316)
  - Unhealthy: Red (#EF4444)
  - Very Unhealthy: Purple (#8B5CF6)
  - Hazardous: Maroon (#991B1B)

### Responsive Design
- **Mobile-First**: Primary target is mobile devices
- **Breakpoints**: Tailwind's default system
- **Touch-Friendly**: Minimum 44px touch targets
- **PWA-Ready**: Service worker and manifest configured

### Accessibility
- **WCAG 2.1 AA**: Target compliance level
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Readers**: Semantic HTML and ARIA labels
- **Color Contrast**: Sufficient contrast ratios

### Loading States
- **Skeleton Loaders**: For air quality data
- **Progress Indicators**: For long operations
- **Error States**: Clear error messages with retry options
- **Empty States**: Helpful guidance when no data

## Dependencies & Versions

### Core Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "^5.8.3",
  "vite": "^5.4.19",
  "@supabase/supabase-js": "^2.55.0",
  "@tanstack/react-query": "^5.83.0",
  "zustand": "^5.0.7",
  "react-router-dom": "^6.30.1",
  "tailwindcss": "^3.4.17"
}
```

### UI Framework
- Complete Radix UI suite for accessible components
- Lucide React for icons
- Tailwind CSS with custom configuration
- CSS variables for theming

### Development Tools
- ESLint with React and TypeScript rules
- Lovable Tagger for development
- PostCSS for CSS processing
- Vite plugins for optimization

## Known Limitations & Technical Debt

### Current Limitations
1. **API Rate Limits**: OpenAQ API has usage limitations
2. **Geolocation Reliability**: Mobile browser location can be inconsistent
3. **Offline Functionality**: Limited offline capabilities
4. **Real-time Updates**: No WebSocket implementation for live updates

### Technical Debt
1. **Error Boundary**: Single error boundary could be more granular
2. **Type Safety**: Some `any` types could be more specific
3. **Test Coverage**: Limited automated testing
4. **Performance Monitoring**: Could benefit from analytics integration

### Future Improvements
1. **PWA Features**: Better offline support and caching
2. **Real-time Data**: WebSocket integration for live updates
3. **Analytics**: User behavior tracking and insights
4. **Internationalization**: Multi-language support
5. **Advanced Caching**: Service worker for data persistence

## Environment Variables

### Required Variables
```bash
# OpenAQ API Configuration
OPENAQ_API_KEY=your_openaq_api_key_here

# Supabase Configuration (handled by Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Security Notes
- `.env` file must be in `.gitignore`
- API keys should never be committed to version control
- Supabase handles environment variable injection for edge functions

## Development Workflow

### Getting Started
1. Clone repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Start development server: `npm run dev`
5. Access application at `http://localhost:8080`

### Build Process
- **Development**: `npm run dev` (Vite dev server)
- **Production**: `npm run build` (Optimized build)
- **Preview**: `npm run preview` (Preview production build)

### Deployment
- **Primary**: Netlify with GitHub integration
- **Process**: Push to GitHub → Automatic deployment
- **Environment**: Production environment variables in Netlify dashboard

---

*This document should be updated whenever significant changes are made to the architecture, dependencies, or business logic. Always ensure this reflects the current state of the application before starting new development work.*