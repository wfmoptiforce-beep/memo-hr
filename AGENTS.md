# Memo Pro - Workforce Management System

## Project Overview
Memo Pro is a real-time workforce management (WFM) web application built as a single-page application (SPA) using vanilla HTML5, CSS3, and ES5 JavaScript. It provides attendance tracking, leave management, quality evaluations, and reporting for contact center operations.

## Technology Stack
- **Frontend**: Pure vanilla JavaScript (no frameworks or build tools)
- **Backend**: Supabase v2 (PostgreSQL with real-time subscriptions)
- **Authentication**: Supabase email/password auth
- **Deployment**: Static hosting (serve `index.html` directly)

## Architecture
The app uses a modular structure with global functions exposed on `window`:
- `js/core/`: Authentication, state management, UI routing
- `js/agent/`: Agent-facing features (punch in/out, team view, leaves)
- `js/admin/`: Administrative functions (user management, scheduling, reports)
- `js/quality/`: Quality assurance evaluations and monitoring

All modules initialize on the `APP_READY` event after authentication.

## Key Conventions
- **Global State**: `window.APP` contains current user (`CU`) and profile (`CP`)
- **Database Access**: Use `window.sb` (Supabase client) for all queries
- **Roles**: Hierarchical permissions (owner > admin > supervisor > quality > agent)
- **Activity States**: "aux" types (online, break, meeting, etc.) tracked in `aux_sessions` table
- **Timezone**: Egypt UTC+2; use `getTodayLocal()` and `toEgyptTime()` for date handling
- **Data Format**: Dates as `YYYY-MM-DD`, times as `HH:MM`, timestamps ISO 8601

## Common Patterns
- Always check `{ data, error }` from Supabase queries
- Use `DOMContentLoaded` for initialization
- Modals are pre-defined in HTML; open/close via `window.openModal(id)`
- CSV exports use BOM (`\uFEFF`) for Excel compatibility

## How to Run Locally
1. Serve `index.html` with HTTPS (Supabase requirement)
2. Example: `python3 -m http.server 8000` then visit `https://localhost:8000`
3. Configure Supabase credentials in `config.js`

## Pitfalls to Avoid
- Sessions may span midnight; auto-close with `syncActiveSession()`
- Role vs status confusion: `role` is permissions, `status` is activity state
- No input validation on frontend; rely on Supabase RLS policies
- Global namespace pollution; avoid overwriting `window` functions

## Essential Files
- [config.js](config.js): Supabase configuration
- [index.html](index.html): Main application file
- [css/main.css](css/main.css): Styling and design system
- Core modules in `js/core/`, feature modules in `js/agent/`, `js/admin/`, `js/quality/`

For detailed documentation, see individual module comments and Supabase table schemas.</content>
<parameter name="filePath">/workspaces/memo-hr/AGENTS.md