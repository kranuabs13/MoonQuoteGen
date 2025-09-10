# MoonQuote Design Guidelines

## Design Approach: Design System (Material Design)
**Justification**: This is a utility-focused professional tool requiring efficiency, consistency, and data-heavy interface handling. Material Design provides excellent patterns for forms, data tables, and enterprise applications while maintaining visual polish.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 219 91% 40% (Professional blue)
- Surface: 0 0% 98% (Clean white background)
- Surface variant: 220 14% 96% (Form backgrounds)
- On surface: 220 9% 17% (Text)
- Border: 220 13% 91% (Subtle borders)

**Dark Mode:**
- Primary: 219 91% 60% (Lighter blue for contrast)
- Surface: 220 13% 9% (Dark background)
- Surface variant: 220 13% 14% (Form backgrounds)
- On surface: 220 9% 83% (Light text)
- Border: 220 13% 21% (Subtle borders)

### Typography
- **Primary**: Inter (Google Fonts) - Clean, professional
- **Headings**: Inter 600 (Semi-bold)
- **Body**: Inter 400 (Regular)
- **Captions**: Inter 400 (Small)

### Layout System
- **Spacing**: Tailwind units 2, 4, 6, 8, 12 for consistent rhythm
- **Split Layout**: 40% input panel | 60% preview panel (desktop)
- **Mobile**: Full-width tabbed interface (Edit/Preview tabs)

### Component Library

#### Navigation
- Clean header with EMET Dorcom branding
- Minimal navigation focused on core quote functions
- Export buttons (PDF/Word) prominently placed

#### Forms
- Grouped input sections with clear labels
- Material Design outlined text fields
- File upload component for customer logos
- BOM table with Excel paste functionality
- Smart calculation fields with real-time updates

#### Data Display
- Live preview panel matching exact quote template
- Professional table styling for BOM items
- Currency formatting with proper alignment
- Clear visual hierarchy for costs and totals

#### Interactive Elements
- Click-to-focus: Preview sections link to input fields
- Real-time validation and error states
- Loading states for calculations and exports
- Toast notifications for save/export actions

#### Overlays
- Modal dialogs for confirmations
- Dropdown menus for selection fields
- Tooltip guidance for complex features

### Visual Treatment
- **Emphasis**: Clean, professional aesthetic matching corporate environment
- **Contrast**: High contrast for data readability
- **Spacing**: Generous whitespace for form clarity
- **Borders**: Subtle borders to separate sections without overwhelming

### Mobile Considerations
- Tabbed interface replacing split-screen
- Touch-friendly form controls
- Optimized table scrolling for BOM data
- Simplified preview for mobile viewing

### Animations
- Minimal, functional animations only
- Smooth transitions between tabs
- Subtle hover states on interactive elements
- No decorative animations that could distract from professional use

This design prioritizes functionality, data clarity, and professional appearance suitable for B2B quote generation workflows.