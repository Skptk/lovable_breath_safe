# CORE DEVELOPMENT RULES - BREATH SAFE PROJECT
## 🚨 MANDATORY COMPLIANCE - NO EXCEPTIONS

This document establishes **ABSOLUTE CORE RULES** that must be followed at all times during development of the Breath Safe air quality monitoring application. These rules are **NON-NEGOTIABLE** and form the foundation of the project's architecture, security, and operational integrity.

---

## **🔒 SECURITY RULES - CRITICAL COMPLIANCE**

### **RULE S1: Row-Level Security (RLS) Enforcement**
- **MANDATE**: All database tables MUST have properly configured RLS policies
- **USER ISOLATION**: Users can ONLY access their own data
- **PUBLIC DATA**: Air quality data is publicly readable but write-protected
- **VIOLATION CONSEQUENCE**: Security breach and data leakage

### **RULE S2: SECURITY DEFINER Prohibition**
- **ABSOLUTE BAN**: NEVER create views with SECURITY DEFINER property
- **RISK**: Privilege escalation and RLS policy bypass
- **EXCEPTION**: Only functions that absolutely require elevated privileges
- **VALIDATION**: All migrations must pass Supabase Security Advisor

### **RULE S3: Environment Variable Security**
- **DEPLOYMENT ONLY**: All sensitive keys stored in Netlify environment variables
- **LOCAL PROHIBITION**: Never store credentials in local .env files
- **CODE SAFETY**: Never expose API keys or secrets in committed code
- **GITIGNORE**: All .env* files must be gitignored

---

## **🏗️ ARCHITECTURE RULES - STRUCTURAL INTEGRITY**

### **RULE A1: Protected Component Immutability**
- **NEVER MODIFY**: [Sidebar](file://src/components/Sidebar.tsx), [Header](file://src/components/Header.tsx), [Footer](file://src/components/Footer.tsx)
- **CORE NAVIGATION**: Sidebar structure is fixed (Dashboard, History, Weather, Store, etc.)
- **BRANDING**: Header contains app identity and theme controls
- **LEGAL**: Footer maintains navigation and legal compliance
- **CONSEQUENCE**: Breaking core user experience and navigation

### **RULE A2: Glass Morphism Design System**
- **UI STANDARD**: All cards MUST use [GlassCard](file://src/components/ui/GlassCard.tsx) not regular Card
- **VISUAL CONSISTENCY**: 100% glass morphism coverage across all components
- **IMPORT RULE**: `import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from "@/components/ui/GlassCard"`
- **NEVER**: Import from "@/components/ui/card" for new development

### **RULE A3: Authentication System Integrity**
- **SUPABASE FOUNDATION**: All auth flows through [AuthContext](file://src/contexts/AuthContext.tsx)
- **USER VALIDATION**: Profile validation required after authentication
- **SESSION MANAGEMENT**: Proper JWT token handling and refresh
- **NO BYPASS**: Authentication cannot be circumvented or mocked

---

## **🛠️ TECHNOLOGY STACK RULES - IMMUTABLE FOUNDATION**

### **RULE T1: Core Technology Constraints**
- **FRONTEND**: Vite + React 18 + TypeScript + TailwindCSS (FIXED)
- **BACKEND**: Supabase (PostgreSQL + Edge Functions + Auth) (FIXED)
- **UI FRAMEWORK**: Shadcn/ui components with glass morphism (FIXED)
- **DEPLOYMENT**: Netlify with GitHub integration (FIXED)
- **NO SUBSTITUTES**: Cannot replace core technologies without project restructure

### **RULE T2: State Management Architecture**
- **DATA FETCHING**: React Query (@tanstack/react-query) for server state
- **APP STATE**: Zustand for client state management
- **REAL-TIME**: Supabase real-time subscriptions for live data
- **NO REDUX**: Do not introduce Redux or other state libraries

### **RULE T3: Deployment-First Testing**
- **NO LOCAL TESTING**: All testing done on Netlify deployment
- **WORKFLOW**: Local Dev → Git Commit → GitHub → Netlify → Live Testing
- **ENVIRONMENT**: Use Netlify environment variables for configuration
- **RATIONALE**: Email verification and full auth require deployed environment

---

## **📊 DATA COLLECTION RULES - OPERATIONAL INTEGRITY**

### **RULE D1: Server-Side Data Collection Priority**
- **PRIMARY SOURCE**: `global_environmental_data` table from scheduled collection
- **EDGE FUNCTION**: [scheduled-data-collection](file://supabase/functions/scheduled-data-collection/index.ts) runs every 15 minutes
- **FALLBACK ONLY**: Legacy API calls only when server data unavailable
- **DATA SOURCE VALIDATION**: Reject "Initial Data", "Mock Data", "Test Data"

### **RULE D2: Data Source Integrity**
- **ACCEPT**: OpenWeatherMap API, OpenAQ API, legitimate API sources
- **REJECT**: Mock, test, placeholder, demo, fake, initial data sources
- **CONTAMINATION PREVENTION**: Enhanced validation prevents bad data entry
- **LOGGING**: Clear data source validation logging for debugging

### **RULE D3: Location Services Protocol**
- **GPS PRIORITY**: Always request user GPS location first
- **IP FALLBACK**: Use ipapi.co for approximate location when GPS denied
- **SESSION MANAGEMENT**: Prevent duplicate IP location requests per session
- **DEFAULT FALLBACK**: Nairobi coordinates as final fallback

---

## **🎨 UI/UX RULES - DESIGN CONSISTENCY**

### **RULE U1: Glass Morphism Implementation**
- **TRANSPARENCY**: All cards use backdrop-blur with proper opacity
- **CONTRAST**: Maintain text readability in light and dark themes
- **VARIANTS**: Use light/medium/heavy opacity levels appropriately
- **HOVER EFFECTS**: Consistent transform and shadow animations

### **RULE U2: Responsive Design Standards**
- **MOBILE FIRST**: Design for mobile then scale up
- **BREAKPOINTS**: Use TailwindCSS responsive classes (sm:, md:, lg:, xl:)
- **OVERFLOW PREVENTION**: Apply overflow-hidden and max-width constraints
- **TEXT HANDLING**: Use truncate classes for long content

### **RULE U3: Navigation Consistency**
- **SIDEBAR**: Fixed navigation for desktop (hidden on mobile)
- **MOBILE MENU**: Hamburger menu for mobile navigation
- **VIEW SWITCHING**: URL parameters for view state (?view=dashboard)
- **DEMO MODE**: Separate navigation for demo users with locked features

---

## **🔄 DEVELOPMENT WORKFLOW RULES - PROCESS INTEGRITY**

### **RULE W1: Code Modification Standards**
- **PRECISION EDITING**: Only modify specific lines needed
- **EXISTING CODE COMMENTS**: Use `// ... existing code ...` for unchanged sections
- **SINGLE RESPONSIBILITY**: One logical change per commit
- **TESTING VALIDATION**: All changes must be tested on Netlify deployment

### **RULE W2: Git and Deployment Process**
- **BRANCH STRATEGY**: Work on feature branches, merge to main
- **COMMIT MESSAGES**: Clear, descriptive commit messages
- **AUTOMATIC DEPLOYMENT**: Netlify deploys on every push to main
- **ENVIRONMENT SYNC**: Ensure Netlify environment variables are current

### **RULE W3: Documentation Maintenance**
- **CONTEXT FILES**: Update project_context_updates.md for significant changes
- **CORE STABILITY**: project_context_core.md remains stable for fundamentals
- **COMMENT CODE**: Add clear comments for complex logic
- **README UPDATES**: Keep README.md current with setup instructions

---

## **🎮 FEATURE DEVELOPMENT RULES - FUNCTIONALITY STANDARDS**

### **RULE F1: Gamification System Integrity**
- **POINTS VALIDATION**: All point awards validated via Edge Functions
- **ACHIEVEMENT SYSTEM**: Progressive unlocking based on user activity
- **WITHDRAWAL SECURITY**: Cash reward system must be secure and auditable
- **USER ENGAGEMENT**: Features must encourage healthy environmental behavior

### **RULE F2: Error Handling Requirements**
- **ERROR BOUNDARIES**: React error boundaries for component-level errors
- **USER FEEDBACK**: Toast notifications for all user-facing errors
- **RETRY MECHANISMS**: Automatic retry for transient failures
- **FALLBACK UI**: Graceful degradation when services unavailable

### **RULE F3: Performance Standards**
- **LAZY LOADING**: Code splitting for heavy components
- **CACHING STRATEGY**: React Query for efficient data caching
- **BUNDLE SIZE**: Regular bundle analysis and optimization
- **REAL-TIME OPTIMIZATION**: Efficient WebSocket connection management

---

## **📱 MOBILE AND ACCESSIBILITY RULES - INCLUSIVE DESIGN**

### **RULE M1: Mobile-First Development**
- **RESPONSIVE DESIGN**: All components must work on mobile devices
- **TOUCH TARGETS**: Minimum 44px touch targets for interactive elements
- **VIEWPORT**: Proper viewport meta tag and responsive scaling
- **PERFORMANCE**: Mobile-optimized bundle sizes and loading times

### **RULE M2: Accessibility Compliance**
- **KEYBOARD NAVIGATION**: All interactive elements keyboard accessible
- **SCREEN READERS**: Proper ARIA labels and semantic HTML
- **COLOR CONTRAST**: WCAG 2.1 AA compliance for text contrast
- **FOCUS INDICATORS**: Clear focus states for all interactive elements

---

## **🚀 DEPLOYMENT AND MONITORING RULES - OPERATIONAL EXCELLENCE**

### **RULE O1: Environment Management**
- **STAGING**: Use Netlify branch deploys for feature testing
- **PRODUCTION**: Main branch auto-deploys to production
- **ENVIRONMENT VARIABLES**: All configs managed through Netlify dashboard
- **SECRETS ROTATION**: Regular rotation of API keys and credentials

### **RULE O2: Monitoring and Logging**
- **CONNECTION HEALTH**: Real-time monitoring of WebSocket connections
- **ERROR TRACKING**: Comprehensive error logging and user feedback
- **PERFORMANCE METRICS**: Regular Lighthouse CI and performance monitoring
- **DATA VALIDATION**: Continuous validation of data source integrity

---

## **⚡ EMERGENCY PROTOCOLS - CRITICAL RESPONSE**

### **RULE E1: Security Incident Response**
- **IMMEDIATE**: Revoke compromised credentials immediately
- **ASSESSMENT**: Audit all affected systems and data
- **COMMUNICATION**: Notify users if personal data affected
- **PREVENTION**: Implement additional security measures

### **RULE E2: Service Outage Handling**
- **FALLBACK**: Activate backup data sources automatically
- **USER COMMUNICATION**: Clear status communication to users
- **RECOVERY**: Systematic service restoration with validation
- **POST-MORTEM**: Document incident and prevention measures

---

## **🔍 VALIDATION AND COMPLIANCE - QUALITY ASSURANCE**

### **RULE V1: Code Quality Standards**
- **TYPESCRIPT**: Strict type checking enabled
- **ESLINT**: All code must pass linting without warnings
- **SECURITY SCANNING**: Regular security scans and vulnerability assessment
- **DEPENDENCY MANAGEMENT**: Keep dependencies updated and secure

### **RULE V2: Database Integrity**
- **MIGRATION SAFETY**: All migrations tested on staging first
- **BACKUP STRATEGY**: Regular database backups and recovery testing
- **PERFORMANCE**: Query optimization and index management
- **RLS VALIDATION**: Regular testing of row-level security policies

---

## **📋 ENFORCEMENT AND COMPLIANCE**

### **MANDATORY CHECKLIST** - Before Any Code Commit:
- [ ] Security rules validated (RLS, no SECURITY DEFINER views)
- [ ] Protected components unchanged (Sidebar, Header, Footer)
- [ ] Glass morphism design system maintained
- [ ] Deployment-first testing completed
- [ ] Environment variables properly configured
- [ ] Data source validation implemented
- [ ] Mobile responsiveness verified
- [ ] Error handling implemented
- [ ] Documentation updated

### **VIOLATION CONSEQUENCES**:
- **SECURITY VIOLATIONS**: Immediate rollback and security review
- **ARCHITECTURE VIOLATIONS**: Component refactoring required
- **DESIGN VIOLATIONS**: UI consistency restoration needed
- **DEPLOYMENT VIOLATIONS**: Testing process correction required

---

## **🎯 SUMMARY - NON-NEGOTIABLE PRINCIPLES**

1. **SECURITY FIRST**: RLS policies, no SECURITY DEFINER, secure credentials
2. **ARCHITECTURE INTEGRITY**: Protected components, glass morphism, auth system
3. **DEPLOYMENT-FIRST**: All testing on Netlify, no local environment dependencies
4. **DATA QUALITY**: Server-side collection priority, source validation
5. **USER EXPERIENCE**: Mobile-first, accessible, performant, beautiful
6. **OPERATIONAL EXCELLENCE**: Monitoring, error handling, graceful degradation

These rules are **CORE MEMORY** and must be **FOLLOWED AT ALL TIMES** with **NO EXCEPTIONS**. They ensure the Breath Safe project maintains its architectural integrity, security posture, and operational excellence while delivering an exceptional user experience for air quality monitoring.

**VIOLATION OF THESE RULES IS STRICTLY PROHIBITED AND WILL RESULT IN IMMEDIATE CORRECTION.**