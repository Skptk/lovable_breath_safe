# Breath Safe - Core Project Context

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
- **Security System** - RLS policies, function permissions, and access control

## Development Workflow

### Testing & Deployment
- **Live Testing**: All testing done on Netlify deployment
- **GitHub Integration**: Changes committed and pushed to GitHub
- **Environment**: Uses .env file (gitignored) for API keys
- **Security**: Never expose sensitive credentials in code

### Code Quality
- **Linting**: ESLint configuration for code standards
- **TypeScript**: Strict type checking enabled
- **Performance**: Lighthouse CI and build analysis
- **Security**: Regular security scanning and credential protection

## Database Schema

### Core Tables
- **users** - User authentication and profile data
- **air_quality_readings** - Historical air quality data
- **weather_data** - Weather information storage
- **user_points** - Rewards and achievement tracking
- **notifications** - User notification system
- **achievements** - Achievement definitions and user progress

### Database Management
- **Migrations**: SQL files in `supabase/migrations/` directory
- **Deployment**: Use `supabase db push --include-all` to apply migrations
- **CLI Tool**: Supabase CLI for direct remote database connection (no Docker required)
- **Version Control**: Migration files tracked in Git for schema history

### RLS Policies
- **User Data Isolation**: Users can only access their own data
- **Public Read Access**: Air quality data publicly readable
- **Authenticated Writes**: Only authenticated users can create records
- **Admin Override**: System functions bypass RLS for maintenance

## API Integrations

### External Services
- **OpenAQ API** - Air quality data source
- **Weather APIs** - Meteorological data
- **Supabase Edge Functions** - Custom backend logic
- **Real-time Updates** - WebSocket connections for live data

### Data Flow
1. **Data Collection**: External APIs provide environmental data
2. **Processing**: Edge functions process and validate data
3. **Storage**: Data stored in Supabase with RLS protection
4. **Real-time Updates**: Changes broadcast to connected clients
5. **User Interface**: React components display processed data

## Security Considerations

### Authentication
- **Supabase Auth**: Secure user authentication system
- **JWT Tokens**: Stateless authentication with secure tokens
- **Password Policies**: Strong password requirements
- **Session Management**: Secure session handling

### Data Protection
- **RLS Policies**: Row-level security for data isolation
- **API Key Protection**: Environment variables for sensitive keys
- **Input Validation**: Server-side validation of all inputs
- **SQL Injection Prevention**: Parameterized queries only

### Supabase Security Advisor Compliance

#### **Critical Security Rules - NEVER VIOLATE**
- **SECURITY DEFINER Views**: NEVER create views with SECURITY DEFINER property
  - **Risk**: Privilege escalation, RLS policy bypass
  - **Rule**: All views must run with caller permissions
  - **Exception**: Only use SECURITY DEFINER for functions that absolutely require elevated privileges

- **Function Security**: Minimize SECURITY DEFINER usage in functions
  - **Risk**: Functions running with creator permissions instead of user permissions
  - **Rule**: Only use SECURITY DEFINER when function must bypass RLS for system operations
  - **Alternative**: Use standard functions that respect RLS policies

- **RLS Policy Enforcement**: Always ensure RLS policies are properly enforced
  - **Risk**: Data leakage between users
  - **Rule**: Test all database operations with RLS policies enabled
  - **Validation**: Verify user isolation in multi-tenant scenarios

#### **Security Advisor Categories to Monitor**
- **SECURITY**: High-priority security vulnerabilities
- **EXTERNAL**: Issues affecting external user access
- **ERROR Level**: Critical issues requiring immediate attention
- **WARNING Level**: Issues requiring prompt resolution

#### **Security Best Practices**
- **Principle of Least Privilege**: Users only access what they need
- **Row-Level Security**: Always implement and test RLS policies
- **Function Permissions**: Grant minimal required permissions
- **View Security**: Ensure views respect user permissions
- **Migration Security**: Review all migrations for security implications

#### **Security Validation Checklist**
Before deploying any database changes:
- [ ] No unnecessary SECURITY DEFINER properties
- [ ] RLS policies properly enforced
- [ ] User data isolation verified
- [ ] Function permissions minimized
- [ ] View security validated
- [ ] Security advisor warnings addressed

#### **Reference: SECURITY DEFINER View Issue (Resolved 2025-01-23)**
- **Issue**: `public.latest_environmental_data` view flagged with SECURITY DEFINER property
- **Security Risk**: ERROR level - Privilege escalation and RLS bypass
- **Solution**: Recreated view without SECURITY DEFINER, maintaining functionality
- **Lesson**: Always verify views run with caller permissions, not creator permissions
- **Migration**: `20250123000008_fix_security_definer_view.sql`

## Performance Optimization

### Frontend
- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Tree shaking and minification
- **Image Optimization**: WebP format and responsive images
- **Caching**: Strategic caching of static assets

### Backend
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Edge Functions**: Serverless compute for scalability
- **Real-time Optimization**: Efficient WebSocket management

## Maintenance & Monitoring

### Health Checks
- **Connection Monitoring**: Real-time connection status
- **Performance Metrics**: Lighthouse CI and build analysis
- **Error Tracking**: Comprehensive error boundary system
- **User Feedback**: Built-in feedback and reporting

### Update Process
1. **Development**: Local development with live testing
2. **Testing**: Comprehensive testing on Netlify
3. **Commit**: Changes committed to GitHub
4. **Deployment**: Automatic deployment via Netlify
5. **Verification**: Post-deployment testing and monitoring

---

*This file contains the core project context and should be referenced for all development decisions. For recent updates and changes, see `project_context_updates.md`.*
