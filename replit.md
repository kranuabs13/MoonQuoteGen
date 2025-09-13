# MoonQuote - Professional Quote Generator

## Overview

MoonQuote is a professional quote generation web application built for EMET Dorcom. It features real-time live preview capabilities and produces professional PDF and Word quotes matching exact template formatting. The application uses a split-screen interface with dynamic input forms on the left and live preview on the right, with responsive mobile/tablet support switching to tabbed interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for build tooling
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with Material Design approach for professional utility-focused interface
- **State Management**: React Hook Form for form handling with Zod validation
- **Data Fetching**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture  
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with `/api` prefix routing
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage
- **Development**: Vite middleware integration for hot module replacement

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Design**: Three main entities:
  - `quotes` table for quote header information (subject, customer, sales person, terms)
  - `bomItems` table for Bill of Materials with sortable items
  - `costItems` table for pricing with support for discounts
- **Hosting**: Neon Database serverless PostgreSQL

### Real-Time Preview System
- **Live Updates**: 200ms debounced form updates trigger instant preview refreshes
- **Split Layout**: 40% input panel, 60% preview panel on desktop
- **Mobile Responsive**: Tabbed interface with Edit/Preview tabs for mobile devices
- **Interactive Features**: Click-to-navigate between form inputs and preview sections

### Component Architecture
- **Form Components**: Modular sections (QuoteHeader, BomSection, CostSection)
- **Preview System**: Real-time QuotePreview component matching exact output formatting
- **Layout System**: MainLayout with responsive breakpoints and theme switching
- **UI Components**: Comprehensive shadcn/ui component library with Radix UI primitives


## External Dependencies

### Core Framework Dependencies
- React 18 with TypeScript support
- Vite for build tooling and development server
- Express.js for backend API server

### UI and Styling
- Radix UI component primitives for accessible UI components
- Tailwind CSS for utility-first styling
- Lucide React for consistent iconography
- Inter font family from Google Fonts for professional typography

### Database and ORM
- Neon Database serverless PostgreSQL hosting
- Drizzle ORM with PostgreSQL dialect for type-safe database operations
- Drizzle Kit for database schema migrations

### Form Handling and Validation
- React Hook Form for performant form management
- Zod for runtime type validation and schema definition
- Hookform Resolvers for Zod integration

### Development and Build Tools
- TypeScript for static type checking
- ESLint and Prettier for code quality (configured via shadcn/ui)
- PostCSS with Autoprefixer for CSS processing

### Session Management
- connect-pg-simple for PostgreSQL-backed session storage
- Express session middleware for user session handling

### Utility Libraries
- date-fns for date manipulation and formatting
- clsx and tailwind-merge for conditional CSS class handling
- class-variance-authority for component variant management