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
- **Profile** (`/?view=profile`) - User profile management and rewards
- **Settings** (`/?view=settings`) - Site-wide settings and preferences
- **History** (`/?view=history`) - Air quality reading history
- **Weather** (`/?view=map`) - Comprehensive weather and air quality monitoring
- **News** (`/?view=news`) - Health and environment news articles
- **Store** (`/?view=store`) - Rewards and achievements
- **Products** (`/?view=products`) - Product recommendations
- **Auth** (`/auth`) - Authentication pages

### Global Layout Components
- **Sidebar** - Desktop navigation (Dashboard, Profile, History, Weather, Store, Products)
- **Header** - App title, theme toggle, notifications
- **Footer** - Navigation links and legal information
- **MobileNavigation** - Hamburger menu for mobile devices

### Weather & Environmental Components
- **WeatherStats** - Comprehensive weather and air quality monitoring (renamed from MapView)
- **WindDashboard** - Interactive wind rose and wind data visualization
- **WeatherForecast** - 7-day weather forecast with detailed meteorological data
- **WeatherStatsCard** - Compact weather information for home dashboard
- **NewsPage** - Dedicated news page with search, filtering, and article management

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
- **Air Quality Monitoring** - Real-time data from OpenWeatherMap API (migrated from OpenAQ)
- **AQI Display System** - Proper color coding based on AQI values with location source indication
- **Rewards System** - Points, achievements, streaks
- **Theme System** - Light/dark mode with persistence
- **Mobile Navigation** - Responsive design with hamburger menu
- **Database Integration** - Full CRUD operations with RLS

### 🔧 Recently Fixed Issues
- **Homepage AQI Card Enhancement** - ✅ COMPLETED: Enhanced homepage AQI card to display emission data breakdown side by side with AQI value, removed separate pollutant details card, integrated all air quality information into single comprehensive card for better user experience
- **OpenAQ to OpenWeatherMap Migration** - ✅ COMPLETED: Completely removed all OpenAQ API connections from emission sources component, replaced with OpenWeatherMap Air Pollution API integration, updated component title from "Emission Sources" to "Air Quality Monitoring", implemented reliable air quality data display using existing OpenWeatherMap infrastructure
- **Emission Sources API Error Handling** - ✅ COMPLETED: Fixed emission sources component to handle OpenAQ API limitations gracefully, replaced error popups with informative carousel content, implemented rate limiting protection and reduced API calls from 30 to 60 minutes, added fallback informational content when API data is unavailable
- **Emission Sources Carousel Implementation** - ✅ COMPLETED: Converted emission sources from grid layout to interactive carousel with navigation arrows, removed all placeholder/mock data generation to ensure only real OpenAQ API data is displayed, improved user experience with smooth scrolling and responsive design
- **Rewards Page Length TypeError Fix** - ✅ COMPLETED: Fixed Rewards page "Cannot read properties of undefined (reading 'length')" error by adding comprehensive null safety checks for streaks and achievements arrays, preventing runtime errors when data is loading or undefined
- **Rewards Page TypeError Fix** - ✅ COMPLETED: Fixed Rewards page "Cannot read properties of undefined (reading 'toFixed')" error by correcting property name mismatch between useUserPoints hook and Rewards component, updated currencyRewards to currencyValue and totalPoints to userPoints.totalPoints, added comprehensive null safety checks to prevent runtime errors
- **Map Card Structure Fix** - ✅ COMPLETED: Fixed WeatherStats map container to be a proper card with the map inside and floating title card on top, improved visual hierarchy and consistency with other dashboard components
- **OpenWeatherMap Air Pollution API Integration** - ✅ COMPLETED: Added OpenWeatherMap air pollution API integration as an additional data source alongside OpenAQ API, implemented fallback mechanism when OpenAQ fails, added AQI conversion from OpenWeatherMap scale (1-5) to standard scale (0-500), configured API key 56ab74b487631610f9b44a6e51fe72f0 for Netlify deployment
- **WeatherStatsCard 400 Error Fix** - ✅ COMPLETED: Fixed WeatherStatsCard 400 error by passing coordinates from AirQualityDashboard, added validation to prevent API calls with invalid coordinates, enhanced error handling with specific error messages for different API failure types
- **Duplicate AQI Data Removal** - ✅ COMPLETED: Removed duplicate AQI data display by eliminating circular progress gauge that showed same AQI value as percentage, cleaned up redundant information for better user experience
- **Titillium Web Font Implementation** - ✅ COMPLETED: Implemented Titillium Web font from Google Fonts throughout the application, added all font weights (200-900) with proper typography hierarchy, updated main headline to use font-black (900) weight as requested, applied consistent font weights across all components for better visual hierarchy
- **OpenAQ API Progressive Radius Search** - ✅ COMPLETED: Enhanced OpenAQ API search with progressive radius strategy (10km → 25km → 50km → 100km → 200km), improved location search with multiple radii (50km, 100km, 200km), better coverage in areas with limited sensors like Kenya, enhanced city detection and fallback handling
- **Settings Page Loading Error Fix** - ✅ COMPLETED: Fixed Settings page loading error by adding missing methods to useNotifications hook, implemented proper notification preferences interface matching database schema, added preferences, updatePreferences, initializePreferences, and isLoading properties, enhanced error handling and loading states for better user experience
- **View Switching Loop Fix** - ✅ COMPLETED: Fixed rapid view switching between dashboard and map views by removing problematic useEffect dependencies in Index component, preventing view switching loops and improving navigation stability
- **Multiple Hook Calls Prevention** - ✅ COMPLETED: Added hook instance tracking to prevent multiple useAirQuality hook calls, improving permission check guards with better logging and instance tracking, and preventing React Query from running multiple times
- **Location Permission Loop Fix** - ✅ COMPLETED: Fixed multiple 'Location permission denied by user' console messages by adding refs to prevent multiple permission checks, improving requestLocationPermission function with duplicate request prevention, disabling React Query auto-refresh to prevent permission loops, and adding manual refresh function for user control
- **Location Permission Error Handling** - ✅ COMPLETED: Enhanced error handling in useAirQuality and WeatherStats components with specific error type logging, reduced console noise for common geolocation errors, and better user feedback for location permission issues
- **Multiple Auth State Changes** - ✅ COMPLETED: Fixed duplicate INITIAL_SESSION auth state changes by adding event deduplication logic in useAuth hook, preventing unnecessary realtime channel reconnections and improving authentication stability
- **Realtime Connection Management** - ✅ COMPLETED: Enhanced realtime client with navigation state tracking to prevent duplicate channel subscriptions during rapid view changes, added 2-second cooldown period after navigation to stabilize connections
- **Location Permission Handling** - ✅ COMPLETED: Added flags to prevent multiple simultaneous location requests in useAirQuality and WeatherStats components, preventing geolocation conflicts and improving user experience
- **Component Lifecycle Management** - ✅ COMPLETED: Added proper cleanup for realtime channels when Index component unmounts, preventing memory leaks and subscription conflicts during navigation
- **View Change Stabilization** - ✅ COMPLETED: Added 100ms delay to view changes to prevent rapid navigation from causing realtime issues and improve overall app stability
- **Placeholder Weather Data Removal** - ✅ COMPLETED: Removed all hardcoded fallback weather values (temperature 25°C, humidity 60%) and demo data (AQI 45, PM2.5 12.5, demo locations) from all components to ensure only real OpenWeatherMap API data is displayed, implemented proper error handling for missing API keys with clear console instructions for configuration
- **Fallback AQI Data Removal** - ✅ COMPLETED: Removed all hardcoded fallback AQI values (65) from Supabase Edge Function to ensure only real air quality data is displayed, implemented proper error handling for missing OpenAQ API key with clear console instructions for configuration
- **Realtime Connectivity Restored** - ✅ COMPLETED: Successfully resolved all WebSocket connection issues, realtime channels (user-notifications, user-profile-points, user-points-inserts) now working perfectly with successful subscriptions and no more CHANNEL_ERROR or TIMED_OUT issues
- **CSP WebSocket Fix** - ✅ COMPLETED: Fixed critical Content Security Policy issue that was blocking Supabase WebSocket (wss://) connections, added Google Fonts support, and relaxed COEP policy to resolve realtime connection errors
- **Performance Optimization Phase 1** - ✅ COMPLETED: Implemented comprehensive build and bundling optimizations including enhanced Vite configuration with manual chunks for heavy libraries (Leaflet, Recharts, Framer Motion), React Query memory optimization with reduced GC time and stale time, Zustand store optimization with LRU cache implementation, route-level code splitting with lazy loading for all heavy components, Leaflet lifecycle optimization with dynamic imports and proper cleanup, security hardening by removing hardcoded Supabase credentials, Netlify security headers with CSP and caching policies, and preconnect/DNS prefetch for critical APIs
- **Profile and Settings Separation** - ✅ COMPLETED: Successfully split ProfileView into dedicated ProfileView (profile management, rewards, withdrawals, account management) and SettingsView (site-wide settings, appearance, privacy, location, data management, notifications)
- **Navigation Enhancement** - ✅ COMPLETED: Added dedicated Settings page to sidebar, footer, and mobile navigation with proper routing and view switching
- **Realtime Client Stability** - Fixed multiple realtime channel errors including CHANNEL_ERROR, TIMED_OUT, and connection issues during sign-out and view changes
- **Realtime Manager Lifecycle** - Implemented proper destroy/reset functionality for realtime connection manager to prevent memory leaks and connection conflicts
- **Sign-out Process** - Enhanced sign-out flow with proper realtime channel cleanup, state reset, and manager destruction to prevent post-signout errors
- **Error Boundary Enhancement** - Improved error boundary component with better module loading error handling, network error detection, and recovery options
- **Channel Reference Counting** - Fixed realtime channel reference counting issues that were causing premature channel removal and subscription conflicts
- **Connection State Management** - Added proper connection state tracking and prevented operations on destroyed realtime managers
- **Complete Password Reset Flow** - Implemented full password reset functionality including email-based reset, new password form with validation, and seamless user experience flow
- **Forgot Password Flow** - Added comprehensive password reset functionality to authentication system with email-based reset, form validation, and user-friendly feedback
- **React Error #301 Resolution** - Fixed critical React rendering errors in NewsPage component by correcting JSX structure and adding comprehensive null safety checks
- **NewsPage Component Stability** - Enhanced NewsPage and ArticleModal components with comprehensive error handling, null safety, and crash prevention mechanisms
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
- **Weather Integration** - Successfully integrated comprehensive weather data, wind visualizations, and forecast overlays into the app
- **Map to WeatherStats Rename** - Renamed MapView component to WeatherStats with enhanced weather functionality
- **Wind Dashboard** - Added interactive wind rose visualization and wind data using Open-Meteo API with Windy API fallback
- **Weather Forecast** - Implemented 7-day weather forecast with Open-Meteo API integration
- **Emission Sources Layer** - Added toggleable emission sources overlay using OpenAQ data with clustering for dense regions
- **Real-Time Weather** - Integrated OpenWeatherMap API for current weather conditions, temperature, humidity, and rain probability
- **Dashboard Weather Card** - Added compact weather stats card to home dashboard showing key weather information
- **API Integration** - Successfully integrated Open-Meteo, OpenWeatherMap, and OpenAQ APIs with proper fallback handling
- **OpenWeatherMap API Configuration** - Fixed missing API key configuration in .env.local file, resolving weather component loading errors
- **Weather Data Storage Enhancement** - Extended database schema to store comprehensive weather data alongside AQI readings
- **Comprehensive Weather Hook** - Created useWeatherData hook for unified weather data management with React Query integration
- **Enhanced WeatherStats Component** - Added comprehensive weather overview cards with real-time data display
- **Dashboard Weather Cards** - Enhanced WeatherStatsCard with additional weather metrics including wind, pressure, and visibility
- **History Detail Modal** - New comprehensive modal component for viewing detailed history information with export functionality
- **Automatic Data Refresh Fix** - Resolved issue where air quality data was only stored on manual refresh, now automatically refreshes every 15 minutes

### 🆕 Current User Experience Improvements
- **Integrated Air Quality Display** - Enhanced homepage AQI card to show comprehensive air quality data in single view, displaying AQI value on left and pollutant breakdown on right, creating cleaner and more informative user experience
- **OpenWeatherMap Air Quality Integration** - Successfully migrated from OpenAQ to OpenWeatherMap Air Pollution API, providing reliable air quality monitoring without API limitations, updated component branding and functionality to reflect new data source
- **Emission Sources Error Handling** - Replaced error popups with informative carousel content when OpenAQ API is unavailable, implemented graceful fallback strategy with educational content about air quality monitoring, added rate limiting protection to prevent API abuse
- **Emission Sources Carousel** - Converted emission sources display from static grid to interactive carousel with smooth navigation, removed all placeholder data to ensure only real API data is shown, improved mobile experience with responsive carousel items
- **Navigation Stability** - Fixed rapid view switching between dashboard and map views, providing stable and predictable navigation between app sections
- **Hook Call Optimization** - Prevented multiple useAirQuality hook calls with instance tracking, improving performance and reducing unnecessary re-renders
- **Location Permission Loop Prevention** - Fixed multiple 'Location permission denied by user' console messages by preventing duplicate permission checks and requests, providing smooth location permission flow
- **Location Permission UX** - Enhanced error handling with specific error type logging, reduced console noise for common geolocation errors, and improved user feedback for location permission issues
- **Authentication Stability** - Significantly reduced duplicate auth state changes and unnecessary realtime reconnections, improving overall app performance and reducing console noise
- **Realtime Connection Reliability** - Enhanced realtime channel management with navigation state tracking prevents duplicate subscriptions during rapid view changes, ensuring stable WebSocket connections
- **Location Permission Handling** - Added protection against multiple simultaneous location requests, preventing geolocation conflicts and improving user experience across components
- **Navigation Performance** - Added view change stabilization with small delays to prevent rapid navigation from causing realtime issues and improve overall app stability
- **Memory Management** - Proper cleanup of realtime channels on component unmount prevents memory leaks and subscription conflicts during navigation
- **Realtime Connection Stability** - Significantly reduced realtime channel errors and connection issues during navigation and sign-out processes
- **Enhanced Error Recovery** - Improved error boundary with specific handling for module loading errors, network issues, and general application errors
- **Sign-out Reliability** - Sign-out process now properly cleans up all realtime connections and prevents post-signout errors
- **Channel Lifecycle Management** - Better realtime channel management prevents duplicate subscriptions and ensures proper cleanup
- **Connection State Tracking** - Real-time connection status monitoring with proper state management and error recovery
- **Complete Password Reset Experience** - Users can now fully reset their passwords through email verification, set new passwords with validation, and seamlessly return to sign-in flow
- **Authentication Enhancement** - Added forgot password functionality with email-based password reset, improved user onboarding for password recovery scenarios
- **News Page Stability** - News page now fully functional with comprehensive error handling, null safety, and crash prevention
- **React Error #301 Resolution** - Successfully resolved critical React rendering errors through multiple layers of fixes including proper data fetching patterns, error boundaries, and component lifecycle management
- **Weather System Status** - All weather components now fully functional with proper API key configuration and real-time data fetching
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
- **Comprehensive Weather Data** - Added real-time weather information including temperature, humidity, rain probability, and sunrise/sunset times
- **Interactive Wind Visualizations** - Implemented wind rose charts and wind speed/direction displays with gust information
- **Weather Forecasting** - Added 7-day weather forecast with temperature ranges, precipitation, and weather condition icons
- **Emission Source Mapping** - Integrated emission source data with clustering and detailed pollutant information
- **Multi-API Integration** - Robust integration of Open-Meteo, OpenWeatherMap, and OpenAQ APIs with intelligent fallback systems
- **Environment Configuration** - Resolved OpenWeatherMap API key missing error by properly configuring .env.local file for weather components
- **API Key Configuration** - Fixed OpenWeatherMap API key configuration in .env.local file, resolving weather component loading errors
- **Comprehensive Weather Data Storage** - Extended database schema to include wind speed, direction, pressure, UV index, and forecast summary alongside AQI readings
- **Unified Weather Data Management** - New useWeatherData hook provides centralized weather data fetching, caching, and storage with React Query integration
- **Enhanced WeatherStats Dashboard** - Added comprehensive weather overview cards with real-time temperature, humidity, wind, pressure, and visibility data
- **Advanced Dashboard Weather Cards** - Enhanced WeatherStatsCard component with additional weather metrics and improved visual design
- **Responsive Weather Layout** - Fully responsive weather data grid that adapts to all Tailwind breakpoints (sm, md, lg, xl)
- **Real-time Data Persistence** - Air quality data now automatically refreshes and saves every 15 minutes, ensuring consistent history tracking
- **Enhanced History Management** - HistoryView now features clickable cards with detailed modal popups, comprehensive weather data display, and individual entry export functionality
- **Console Warning Fixes** - Resolved DialogDescription warnings in HistoryDetailModal and improved error handling for OpenAQ API failures
- **Major UI Overhaul** - Removed emissions sources from weather page, created dedicated news page, replaced news card with news preview on homepage, and removed redundant air quality details card
- **News Page Console Error Fixes** - Added comprehensive null safety, error handling, and loading states to NewsPage component to resolve "Cannot read properties of null" errors
- **React Error #301 Fix** - Fixed critical React rendering errors in NewsPage component by correcting JSX structure, adding comprehensive null safety checks, and improving error handling for article data
- **React Error #301 Additional Fixes** - Implemented additional error prevention measures including useEffect for data fetching, React.useMemo for filtered articles, and enhanced error boundaries to prevent component crashes
- **ArticleModal Component Stability** - Enhanced ArticleModal with null safety checks, proper date field handling, and fallback values to prevent crashes when article data is incomplete
- **Component Error Prevention** - Added comprehensive safety checks for all article properties (title, imageUrl, category, author, publishedAt, readTime) to prevent runtime crashes

### 📱 Current Navigation System
- **Single-Page Application** with URL parameters (`?view=dashboard`)
- **Custom Event System** for view changes between components
- **Footer Navigation** - Uses `navigateToView()` function
- **Sidebar Navigation** - Direct view switching with 8 main views
- **Mobile Navigation** - Hamburger menu with dropdown
- **Profile & Settings Separation** - Dedicated ProfileView for user management and dedicated SettingsView for app preferences

### 🔧 Profile & Settings Architecture

#### ProfileView (Profile Management)
- **User Information** - Edit name, view email, avatar management
- **User Statistics** - Total readings, points earned, member since, favorite location
- **Rewards System** - Points display, gift card redemption, currency conversion
- **Withdrawal Management** - Request withdrawals, view withdrawal history
- **Account Management** - Data export, account deletion options
- **Sign Out** - User authentication logout

#### SettingsView (Site-Wide Preferences)
- **Notifications** - Push notifications, email preferences, alert settings
- **Appearance** - Theme preferences, language selection, unit systems
- **Privacy** - Data sharing, public profile, location history settings
- **Location** - Auto-location, accuracy settings, location history
- **Data Management** - Retention policies, data export, storage settings
- **Legal** - Privacy policy, terms of service links

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
- **Singleton Connection Manager** - Centralized realtime client with reference counting and lifecycle management
- **Channel Lifecycle Management** - Prevents duplicate subscriptions and ensures proper cleanup with delayed removal
- **Automatic Reconnection** - Exponential backoff retry with user-friendly status updates
- **Error Recovery** - Channel-level error handling with automatic recovery and connection state tracking
- **Performance Optimization** - Reduced WebSocket overhead and improved connection stability
- **UI Status Integration** - Global banner showing connection state with smooth animations
- **Manager Lifecycle** - Proper destroy/reset functionality to prevent memory leaks and connection conflicts
- **Connection State Tracking** - Real-time connection status monitoring with proper state management

### External APIs
- **OpenAQ**: Air quality data and emission source information (with fallback handling)
- **Open-Meteo**: Wind data, weather forecasts, and meteorological information (primary weather data source)
- **OpenWeatherMap**: Real-time weather conditions, temperature, humidity, precipitation data, and air pollution data (AQI, PM2.5, PM10, NO2, SO2, CO, O3) with API key 56ab74b487631610f9b44a6e51fe72f0 configured for Netlify deployment
- **Windy API**: Wind data fallback when Open-Meteo is unavailable
- **Google Maps**: Location services (when configured)

## User Experience Features

### Core Functionality
- **Air Quality Monitoring** - Real-time AQI and pollutant data
- **Weather Monitoring** - Current conditions, forecasts, and meteorological data
- **Wind Analysis** - Interactive wind rose, speed, direction, and gust information
- **Emission Source Mapping** - Environmental impact sources with clustering and pollutant data
- **Location Services** - GPS-based air quality and weather readings
- **Personal Dashboard** - Customized air quality and weather insights
- **Health Tracking** - Environmental impact monitoring and weather-related health factors
- **Rewards System** - Gamified environmental awareness and weather monitoring

### User Journey
1. **Landing** → Learn about the app
2. **Sign Up** → Create account
3. **Dashboard** → View air quality, weather, and news preview
4. **Weather** → Comprehensive weather stats, wind data, and forecasts
5. **News** → Browse health and environment articles with search and filtering
6. **Profile** → Customize settings and view stats
7. **History** → Track air quality over time
8. **Rewards** → View achievements and progress
9. **Password Recovery** → Reset forgotten passwords via email verification

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

## Performance Optimization Status

### ✅ Phase 1 - Build & Bundling Optimizations (COMPLETED)

#### Vite Configuration Enhancements
- **Enhanced Manual Chunks**: Implemented comprehensive code splitting for heavy libraries including Leaflet, Recharts, Framer Motion, and UI components
- **Build Optimizations**: Added ES2020 target, CSS code splitting, esbuild minification, and disabled sourcemaps for production
- **Analyzer Tooling**: Added rollup-plugin-visualizer and vite-plugin-inspect for bundle analysis with `npm run analyze` script

#### React Query Memory Optimization
- **Reduced Memory Footprint**: Lowered GC time from 5 minutes to 2 minutes, stale time from 5 minutes to 1 minute
- **Performance Tuning**: Disabled refetch on window focus, enabled refetch on reconnect, reduced retry attempts to 1
- **Cache Management**: Optimized query and mutation retry strategies for better memory efficiency

#### Zustand Store Optimization
- **LRU Cache Implementation**: Replaced naive cache with efficient LRU cache (max 50 entries, 5-minute TTL)
- **Selective Persistence**: Implemented partialize to only persist essential user data (user, profile, location)
- **Memory Management**: Excluded transient data (cache, lastReading, error, isLoading) from persistence

#### Route-Level Code Splitting
- **Lazy Loading**: Converted all heavy components to lazy imports with Suspense boundaries
- **Component Splitting**: Implemented lazy loading for AirQualityDashboard, HistoryView, WeatherStats, ProfileView, SettingsView, Rewards, Store, and NewsPage
- **Loading Skeletons**: Added PageSkeleton component for smooth loading experience

#### Leaflet Map Optimization
- **Dynamic Imports**: Implemented dynamic loading of Leaflet library and CSS only when needed
- **Performance Options**: Added preferCanvas, updateWhenIdle, and disabled zoomAnimation for better performance
- **Lifecycle Management**: Enhanced cleanup with proper layer removal, event cleanup, and map instance destruction

#### Security Hardening
- **Credential Removal**: Eliminated hardcoded Supabase fallback credentials for security
- **Environment Validation**: Implemented strict environment variable validation with fail-fast approach
- **Netlify Security Headers**: Added comprehensive security headers including CSP, X-Frame-Options, and CORS policies

#### Network & Caching Optimization
- **Preconnect Links**: Added preconnect and DNS prefetch for Supabase and OpenStreetMap APIs
- **Asset Caching**: Implemented long-term caching for JS bundles and assets with immutable cache policy
- **HTML Caching**: Disabled caching for index.html to ensure fresh content delivery

#### Development Observability
- **Memory Profiler**: Created dev-only Profiler component for monitoring Chrome memory usage
- **Performance Monitoring**: Added 30-second interval logging of memory consumption and React Query status
- **Bundle Analysis**: Integrated rollup-plugin-visualizer for comprehensive bundle size analysis

### 🎯 Expected Performance Improvements
- **Bundle Size**: Target 30-50% reduction in initial JavaScript payload
- **Memory Usage**: Target <500MB Chrome memory usage after 5 minutes idle + navigation
- **Loading Performance**: Improved Time-to-Interactive and First Contentful Paint
- **Security Score**: A+ rating on securityheaders.com with comprehensive CSP and security headers

### ✅ **Current Status - All Systems Operational**

#### **Performance Optimizations** ✅
- **Bundle Splitting**: Working perfectly with separate chunks for each component
- **Lazy Loading**: Components load on-demand with smooth transitions
- **Memory Management**: React Query and Zustand optimizations active
- **Code Splitting**: Route-level and component-level splitting functional

#### **Realtime Connectivity** ✅
- **WebSocket Connections**: All Supabase realtime channels working
- **Channel Subscriptions**: user-notifications, user-profile-points, user-points-inserts
- **No Connection Errors**: CHANNEL_ERROR and TIMED_OUT issues resolved
- **Live Updates**: Real-time data synchronization active

#### **Security & Headers** ✅
- **CSP Policy**: Balanced for functionality and security
- **WebSocket Support**: wss:// connections allowed for Supabase
- **Font Loading**: Google Fonts properly configured
- **Asset Caching**: Long-term caching for performance

#### **API Integration** ⚠️
- **Supabase**: Fully functional with realtime
- **OpenAQ**: Air quality data working with enhanced progressive radius search (10km → 200km) for better coverage in areas with limited sensors (like Kenya), requires OPENAQ_API_KEY in Supabase environment variables
- **Open-Meteo**: Wind and forecast data working
- **OpenWeatherMap**: API key needed for enhanced weather features

### 📋 Next Phase Tasks
- **Component-Level Optimization**: Implement IntersectionObserver-based lazy loading for sub-components
- **Virtualization**: Add react-window for long lists in HistoryView and other components
- **Image Optimization**: Compress and convert images to WebP/AVIF formats
- **CSS Optimization**: Remove unused CSS and implement critical CSS inlining

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