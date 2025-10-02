# Overview

This is a meetup/social gathering application built with React, Express, and PostgreSQL. The application enables users to discover, create, and participate in small group meetups centered around shared interests. Users can join topic-based gatherings, communicate with other participants, host their own events, and provide feedback on the platform. The interface is primarily designed in Hebrew, indicating a focus on Hebrew-speaking users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching

**UI Component System**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- CSS variables for theming (light/dark mode support)
- Mobile-first responsive design with bottom navigation

**State Management Strategy**
- Server state managed via TanStack Query with caching and optimistic updates
- Authentication context provides global user state
- Local component state for UI interactions
- No global client state management library (Redux/Zustand) - keeps architecture simple

**Key Frontend Patterns**
- Protected routes requiring authentication
- Custom hooks for cross-cutting concerns (useAuth, useIsMobile, useToast)
- Form validation using React Hook Form with Zod schemas
- Optimistic UI updates for better perceived performance

## Backend Architecture

**Server Framework**
- Express.js with TypeScript for the REST API
- Session-based authentication using Passport.js with LocalStrategy
- PostgreSQL session store for persistent sessions

**Authentication & Security**
- Password hashing using Node.js crypto (scrypt) with random salts
- Session management with express-session
- CSRF protection through same-origin credentials
- Trust proxy configuration for deployment behind reverse proxies

**API Design**
- RESTful endpoints following resource-based conventions
- JSON request/response format
- Consistent error handling with appropriate HTTP status codes
- Request logging middleware for API routes

**Development Experience**
- Hot module replacement in development via Vite
- Separate build processes for client and server
- TSX for running TypeScript server code in development

## Data Storage

**Database**
- PostgreSQL via Neon serverless (cloud-hosted)
- WebSocket-based connection pooling for serverless environments
- Drizzle ORM for type-safe database queries and schema management

**Schema Design**
- Users table with email authentication and profile information
- Meetups table with host relationships, topics, capacity limits, and icebreaker questions
- Participations join table tracking user-meetup relationships
- Messages table for meetup-specific chat functionality
- App feedback table for user feedback with ratings and categories

**Database Relations**
- One-to-many: User -> Meetups (as host)
- Many-to-many: Users <-> Meetups (via Participations)
- One-to-many: Meetup -> Messages
- One-to-many: User -> Messages
- Drizzle relations API provides type-safe query building with joins

**Migration Strategy**
- Drizzle Kit for schema migrations
- Schema defined in TypeScript, shared between client and server
- Push-based deployment for rapid development

## External Dependencies

**Database & Infrastructure**
- Neon Serverless PostgreSQL - Cloud database with WebSocket connections
- connect-pg-simple - PostgreSQL session store for Express sessions

**Authentication**
- Passport.js - Authentication middleware
- passport-local - Local username/password strategy

**UI Component Libraries**
- Radix UI - Unstyled accessible component primitives (accordions, dialogs, dropdowns, etc.)
- Tailwind CSS - Utility-first CSS framework
- shadcn/ui - Pre-built component patterns using Radix + Tailwind

**Form Management**
- React Hook Form - Performant form state management
- Zod - TypeScript-first schema validation
- @hookform/resolvers - Zod resolver for React Hook Form
- drizzle-zod - Generate Zod schemas from Drizzle tables

**Date Handling**
- date-fns - Modern date utility library with tree-shaking support
- Hebrew locale support for date formatting

**Development Tools**
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- Vite plugin ecosystem for enhanced DX

**Fonts & Assets**
- Google Fonts (Architects Daughter, DM Sans, Fira Code, Geist Mono)
- Custom logo assets stored in attached_assets directory

**Type Safety**
- Shared TypeScript types between client and server via `shared/schema.ts`
- Zod schemas generated from Drizzle tables for validation
- Path aliases (@/, @shared/, @assets/) for clean imports