# Breath Safe - Project Context

## Project Overview
**Breath Safe** is a comprehensive air quality monitoring web application built with modern web technologies. The app helps users track air quality, earn rewards for environmental awareness, and maintain health-conscious habits.

## Technology Stack
- **Frontend**: Vite + React + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Deployment**: Netlify (live testing and deployment)
- **State Management**: Zustand + React Query
- **UI Components**: Shadcn/ui + Lucide React Icons

## Architecture Overview

### Core Structure
```
src/
├── pages/           # Main page components
├── components/      # Reusable UI components
├── hooks/          # Custom React hooks
├── contexts/       # React contexts (Theme, Auth)
├── store/          # Zustand state management
├── integrations/   # External service integrations
├── types/          # TypeScript type definitions
└── lib/            # Utility functions
```

### Key Pages
- **Landing** (`/`) - Public homepage with hero and features
- **Dashboard** (`/?view=dashboard`) - Main app interface
- **Profile** (`/?view=profile`) - User settings and preferences
- **History** (`/?view=history`) - Air quality reading history
- **Map** (`/?view=map`) - Interactive air quality map
- **Store** (`/?view=store`) - Rewards and achievements
- **Products** (`/?view=products`) - Product recommendations
- **Auth** (`/auth`) - Authentication pages

### Global Layout Components
- **Sidebar** - Desktop navigation (Dashboard, Profile, History, Map, Store, Products)
- **Header** - App title, theme toggle, notifications
- **Footer** - Navigation links and legal information
- **MobileNavigation** - Hamburger menu for mobile devices

## UI Design System

### Color Scheme
- **Primary**: Blue-based theme with consistent accent colors
- **Background**: Light/dark mode support with proper contrast
- **Cards**: Subtle borders and shadows for depth
- **Text**: Consistent typography hierarchy

### Component Rules
- **Cards**: Always use consistent padding, rounded corners, and shadows
- **Buttons**: Maintain consistent styling and hover states
- **Forms**: Use consistent input styling and validation
- **Typography**: Follow established font sizes and weights
- **Spacing**: Use consistent margin/padding values

### Responsive Design
- **Desktop**: Sidebar always visible, full-width content
- **Mobile**: Hamburger menu, stacked layout, optimized touch targets
- **Breakpoints**: Follow TailwindCSS responsive classes

## Critical Constraints - DO NOT BREAK

### Protected Components (Never Modify)
- **Sidebar** - Core navigation structure
- **Header** - App branding and theme controls
- **Footer** - Navigation and legal links
- **Card Components** - Dashboard cards and UI elements
- **Authentication System** - User login/logout flow

### Protected Functionality
- **Theme System** - Light/dark mode switching
- **User Authentication** - Supabase auth integration
- **Air Quality Data** - Supabase Edge Function integration
- **Database Operations** - RLS policies and data integrity
- **Rewards System** - Points calculation and achievements

## Current Implementation Status

### ✅ Completed Features
- **Authentication System** - Full Supabase auth with email/password
- **Dashboard** - Air quality display, notifications, rewards
- **Profile Management** - User settings, preferences, data
- **Air Quality Monitoring** - Real-time data from OpenAQ API
- **Rewards System** - Points, achievements, streaks
- **Theme System** - Light/dark mode with persistence
- **Mobile Navigation** - Responsive design with hamburger menu
- **Database Integration** - Full CRUD operations with RLS

### 🔧 Recently Fixed Issues
- **Theme Switching** - Profile page no longer overrides user theme preference
- **Console Errors** - Geolocation violations and navigation 404s resolved
- **Air Quality Data** - Reliable fallback data when API has no coverage
- **Footer Navigation** - Proper view-based navigation system
- **Data Saving** - Air quality readings now properly stored in database
- **Map Visibility** - Increased map height from 384px to 600px for better user interaction
- **New User Geolocation** - Added retry mechanism and fallback handling for new accounts
- **Leaflet Map Errors** - Fixed multiple map initialization conflicts and container issues
- **Database Permission Errors** - Fixed 406 errors for new users without air quality readings
- **UI Component Warnings** - Resolved controlled/uncontrolled Select component state issues
- **New User Experience** - Added demo mode with fallback data for location-unavailable scenarios
- **Geolocation Error Handling** - Reduced console noise and improved user feedback for location failures
- **Permission Management** - Added better permission checking before geolocation calls
- **Retry Mechanism** - Enhanced retry system with user-friendly messages and progress indicators
- **Demo Mode UX** - Added retry options and reset functionality for better new user onboarding
- **HistoryView Geolocation** - Fixed geolocation errors in history component with proper permission checking
- **Mobile Experience** - Enhanced mobile navigation with slide-out drawer, improved responsive layouts, and better mobile spacing
- **Header Component Error** - Fixed "Header is not defined" runtime error by removing unused import and functions from Index component and adding Header to components index for proper module resolution
- **Header Import Issues** - Fixed missing Header imports in ProfileView and created stable alias exports for maximum compatibility
- **Supabase Realtime Stability** - Implemented graceful handling of WebSocket connection failures with exponential backoff retry and session-level fallback
- **Realtime Connection Manager** - Centralized realtime client with Map-based channel management to prevent duplicate subscriptions and WebSocket spam
- **Realtime Architecture Overhaul** - Complete rewrite of realtime client with singleton connection manager, reference counting, and automatic reconnection
- **Realtime UI Feedback** - Added global status banner with smooth animations showing connection state (connected/reconnecting/disconnected)
- **Realtime Hook System** - Created useRealtimeStatus hook for components to monitor connection status
- **Realtime Error Handling** - Enhanced error handling with exponential backoff retry and channel-level error recovery
- **Realtime Channel Management** - Implemented reference counting system to prevent premature channel cleanup and ensure proper lifecycle management
- **Realtime Channel Reference Counting** - Fixed immediate channel removal issue by implementing delayed cleanup with 1-second timeout to prevent premature unsubscription
- **AQI Data Loading Issues** - Fixed infinite loading state by improving permission checking logic and adding timeout mechanism to prevent API calls from hanging indefinitely
- **Realtime Subscription Stability** - Enhanced subscription cleanup with mounted state tracking and delayed unsubscription to prevent immediate channel removal during component lifecycle changes

### 🆕 Current User Experience Improvements
- **Map Interaction** - Map now occupies 600px height (was 384px) for better visibility and interaction
- **New User Support** - Automatic retry mechanism for geolocation services with 3 attempts
- **Error Handling** - Better error messages and fallback options for location unavailable scenarios
- **Auto-Retry** - 2-second delay between geolocation attempts for new accounts
- **Visual Feedback** - Progress indicators showing retry attempts and auto-retry status
- **Demo Mode** - Fallback demo data for new users when location services aren't ready
- **Database Error Prevention** - Graceful handling of queries for users without air quality history
- **UI State Consistency** - All Select components now properly initialized to prevent warnings
- **Geolocation UX** - Reduced console noise and improved user feedback for location failures
- **Permission Flow** - Better permission checking and user guidance for location access
- **Retry Experience** - Enhanced retry system with clear progress indicators and user-friendly messages
- **Demo Mode Options** - Added retry buttons and reset functionality for better new user onboarding
- **History Component** - Improved geolocation handling in history view with proper permission checks
- **Mobile Navigation** - Enhanced slide-out drawer with smooth animations, theme toggle, and sign-out functionality
- **Responsive Layouts** - Improved mobile-first design with better grid layouts, spacing, and component stacking
- **Mobile Header** - Integrated hamburger menu in header with proper mobile positioning and responsive elements
- **Card Responsiveness** - Enhanced mobile layouts for dashboard cards, news articles, and stat displays
- **Touch Optimization** - Better touch targets, spacing, and mobile-friendly interactions across all components
- **Realtime Connection Status** - Global banner showing realtime connection state with smooth animations
- **Realtime Error Recovery** - Automatic reconnection with exponential backoff and user-friendly status updates
- **Realtime Channel Efficiency** - Reference counting system prevents duplicate subscriptions and ensures proper cleanup
- **Realtime Performance** - Singleton connection manager reduces WebSocket overhead and improves connection stability
- **Realtime Channel Stability** - Delayed cleanup mechanism prevents immediate channel removal and ensures stable realtime connections
- **AQI Loading Reliability** - Timeout mechanism prevents infinite loading states and provides better error handling for API failures
- **Permission State Management** - Improved permission checking logic prevents race conditions and ensures consistent user experience
- **Demo Data Fallback** - Added option to show demo data when API is unavailable, preventing users from being stuck on loading screens

### 📱 Current Navigation System
- **Single-Page Application** with URL parameters (`?view=dashboard`)
- **Custom Event System** for view changes between components
- **Footer Navigation** - Uses `navigateToView()` function
- **Sidebar Navigation** - Direct view switching
- **Mobile Navigation** - Hamburger menu with dropdown

## Development Guidelines

### Code Standards
- **TypeScript**: Strict typing, no `any` types
- **React**: Functional components with hooks, proper dependency arrays
- **Performance**: Lazy loading, memoization, optimized re-renders
- **Security**: No hardcoded credentials, proper environment variables
- **Testing**: Live testing on Netlify, no local development

### File Modification Rules
1. **Always check** `project_context.md` before making changes
2. **Never modify** protected components (Sidebar, Header, Footer, Cards)
3. **Extend functionality** instead of overwriting existing code
4. **Maintain consistency** with established design patterns
5. **Test thoroughly** before pushing to GitHub
6. **Follow naming conventions** established in the codebase

### Deployment Process
1. **Build locally** with `npm run build`
2. **Commit changes** with descriptive messages
3. **Push to GitHub** master branch
4. **Netlify auto-deploys** for live testing
5. **No local testing** - rely on Netlify deployment

## API Integrations

### Supabase Services
- **Database**: PostgreSQL with RLS policies
- **Authentication**: Email/password with session management
- **Edge Functions**: Air quality data processing
- **Real-time**: Live updates for notifications and data

### Realtime Architecture
- **Singleton Connection Manager** - Centralized realtime client with reference counting
- **Channel Lifecycle Management** - Prevents duplicate subscriptions and ensures proper cleanup
- **Automatic Reconnection** - Exponential backoff retry with user-friendly status updates
- **Error Recovery** - Channel-level error handling with automatic recovery
- **Performance Optimization** - Reduced WebSocket overhead and improved connection stability
- **UI Status Integration** - Global banner showing connection state with smooth animations

### External APIs
- **OpenAQ**: Air quality data (with fallback handling)
- **Google Maps**: Location services (when configured)

## User Experience Features

### Core Functionality
- **Air Quality Monitoring** - Real-time AQI and pollutant data
- **Location Services** - GPS-based air quality readings
- **Personal Dashboard** - Customized air quality insights
- **Health Tracking** - Environmental impact monitoring
- **Rewards System** - Gamified environmental awareness

### User Journey
1. **Landing** → Learn about the app
2. **Sign Up** → Create account
3. **Dashboard** → View air quality and earn points
4. **Profile** → Customize settings and view stats
5. **History** → Track air quality over time
6. **Rewards** → View achievements and progress

## Performance Requirements

### Loading Optimization
- **Lazy Loading** - Components loaded on demand
- **Image Optimization** - Proper sizing and compression
- **Bundle Splitting** - Separate chunks for different routes
- **Caching** - React Query for API data caching

### Mobile Performance
- **Touch Optimization** - Proper touch targets and gestures
- **Battery Efficiency** - Minimal background processing
- **Offline Support** - Cached data when possible
- **Fast Loading** - Optimized for slower connections

## Security Considerations

### Data Protection
- **RLS Policies** - Database-level access control
- **Authentication** - Secure session management
- **Input Validation** - Client and server-side validation
- **Environment Variables** - No hardcoded secrets

### Privacy Features
- **User Consent** - Location permission management
- **Data Retention** - Configurable data storage policies
- **Anonymous Options** - Basic functionality without account

---

## Golden Rule
**ALWAYS check this `project_context.md` file before generating or modifying any files. This document is the single source of truth for the Breath Safe project.**

### Before Making Changes
1. **Read this entire document**
2. **Understand the current architecture**
3. **Identify protected components**
4. **Plan changes that extend, not overwrite**
5. **Follow established patterns and constraints**
6. **Test thoroughly before deployment**

### When in Doubt
- **Preserve existing functionality**
- **Maintain design consistency**
- **Follow established naming conventions**
- **Consult the current codebase structure**
- **Prioritize user experience and performance**
