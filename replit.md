# GWT Task Management System

## Overview

GWT Task Management is a comprehensive Arabic-language task and employee management system designed for companies. The application provides real-time employee activity tracking through AUX (auxiliary) status monitoring, task management with Kanban boards, HR management features, and analytics reporting. Built as a full-stack web application with modern technologies, it serves employees, sub-admins, and administrators with role-based access control.

## Recent Changes

### October 11, 2025 - Google Calendar OAuth 2.0 Integration
- **Migrated from Replit-specific connector to portable OAuth 2.0** - Replaced Replit's Google Calendar connector with standard OAuth 2.0 flow
- **Database**: Added `google_calendar_tokens` table to store user OAuth tokens (access_token, refresh_token, expires_at)
- **Backend**: Implemented full OAuth flow with authorization, callback, token storage, and automatic token refresh
- **Frontend**: Added "Connect Google Calendar" button in meeting dialog for in-app authentication
- **API Endpoints**:
  - `GET /api/google-calendar/auth` - Initiates OAuth flow
  - `GET /api/google-calendar/callback` - Handles OAuth callback and stores tokens
  - `GET /api/google-calendar/status` - Checks connection status
  - `DELETE /api/google-calendar/disconnect` - Disconnects Google Calendar
- **Portability**: Solution now works on any VPS without Replit dependencies

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn UI components built on Radix UI primitives
- Tailwind CSS for styling with CSS variables for theming
- RTL (Right-to-Left) support with Arabic fonts (Noto Sans Arabic)

**Design Patterns:**
- Component-based architecture with reusable UI components in `/client/src/components/ui`
- Custom hooks pattern for shared logic (auth, toast notifications, mobile detection)
- Protected routes using HOC pattern for authentication-required pages
- Context API for global auth state management
- Real-time updates using WebSocket connections

**Key Features:**
- Dark mode support with localStorage persistence
- Responsive design with mobile breakpoint detection
- Arabic localization throughout the UI
- Real-time data synchronization with 5-second polling intervals

### Backend Architecture

**Technology Stack:**
- Node.js with Express.js server framework
- TypeScript for type safety across the stack
- Passport.js with local strategy for authentication
- Express sessions with PostgreSQL session store
- WebSocket server for real-time employee status updates
- Drizzle ORM for database operations

**Authentication & Security:**
- Custom authentication using bcrypt for password hashing with scrypt algorithm
- Session-based authentication with secure HTTP-only cookies
- JWT-style session tokens stored in PostgreSQL
- Role-based access control (admin, sub-admin, employee roles)
- Password reset functionality with backend-generated tokens

**API Design:**
- RESTful API endpoints under `/api` prefix
- Middleware for authentication (`requireAuth`) and role authorization (`requireRole`)
- Centralized error handling and logging
- Request/response logging with duration tracking

### Database Architecture

**Database:** PostgreSQL (via Neon serverless)

**Schema Design:**
- **users table**: Employee information with roles, department, profile data, salary, and timestamps
- **auxSessions table**: Real-time activity tracking with status, duration, and notes
- **tasks table**: Task management with status, priority, assignments, and collaboration
- **taskCollaborators**: Many-to-many relationship for task collaboration
- **taskNotes**: Comments and updates on tasks
- **leaveRequests**: HR leave management with approval workflow
- **notifications**: User notification system
- **shifts**: Employee shift scheduling

**Data Relationships:**
- User → AUX Sessions (one-to-many)
- User → Tasks (one-to-many as creator and assignee)
- Tasks → Collaborators (many-to-many through junction table)
- Tasks → Notes (one-to-many)
- User → Leave Requests (one-to-many)

**Key Design Decisions:**
- UUID primary keys for all tables
- Enum types for status fields (role, aux_status, task_status, etc.)
- Soft delete pattern with `isActive` flags
- Timestamp tracking (createdAt, updatedAt) on all entities
- Cascading deletes for dependent records

### State Management

**Client-Side State:**
- TanStack Query for server state with 5-minute stale time
- React Context for authentication state
- Local component state for UI interactions
- localStorage for user preferences (dark mode)

**Real-Time Updates:**
- WebSocket connections for live employee status
- Query invalidation on mutations for immediate UI updates
- Optimistic updates for better user experience
- Polling fallback with configurable intervals (1-5 seconds)

## External Dependencies

### Third-Party Services

**Database:**
- Neon Serverless PostgreSQL (`@neondatabase/serverless`)
- WebSocket support via `ws` package for serverless connections

**Session Storage:**
- `connect-pg-simple` for PostgreSQL-backed Express sessions
- Session persistence in database for scalability

**UI Component Libraries:**
- Radix UI primitives for accessible components (@radix-ui/*)
- Shadcn UI component system
- Embla Carousel for carousel functionality
- cmdk for command palette
- Chart.js for analytics visualization

**Form Management:**
- React Hook Form with @hookform/resolvers
- Zod for schema validation
- drizzle-zod for database schema to Zod conversion

**Utilities:**
- date-fns for date manipulation and formatting
- class-variance-authority for component variants
- clsx and tailwind-merge for className management
- nanoid for unique ID generation

**Development Tools:**
- Replit-specific plugins (vite-plugin-runtime-error-modal, vite-plugin-cartographer, vite-plugin-dev-banner)
- ESBuild for production bundling
- tsx for TypeScript execution in development

### API Integration Points

**Internal APIs:**
- `/api/auth` - Authentication endpoints (login, register, logout)
- `/api/user` - Current user information
- `/api/tasks` - Task CRUD operations
- `/api/aux` - AUX session management
- `/api/admin` - Admin-only endpoints for employee management
- `/api/analytics` - Reporting and analytics data
- `/api/notifications` - User notifications
- `/api/profile` - User profile management

**WebSocket Endpoints:**
- `/ws` - Real-time employee status updates and system notifications

### Environment Configuration

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string (Neon database)
- `SESSION_SECRET` - Secret key for session encryption (defaults to development key)
- `NODE_ENV` - Environment mode (development/production)

**Google Calendar OAuth Configuration:**
- `GOOGLE_CLIENT_ID` - Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth 2.0 Client Secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (e.g., `https://yourdomain.com/api/google-calendar/callback`)

To set up Google Calendar integration:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Go to "Credentials" and create OAuth 2.0 Client ID
5. Add authorized redirect URIs: `https://yourdomain.com/api/google-calendar/callback`
6. Copy the Client ID and Client Secret to your environment variables

**Build Configuration:**
- Separate client and server builds
- Server bundled with esbuild for production
- Client built with Vite and served as static files
- TypeScript path aliases (@/, @shared/, @assets/)