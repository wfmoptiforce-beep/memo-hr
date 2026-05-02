# Memo Pro - Workforce Management System

Memo Pro is a comprehensive workforce management (WFM) web application designed for contact centers and similar operations. It provides real-time attendance tracking, leave management, quality evaluations, shift scheduling, and detailed reporting to help manage teams efficiently.

## Features

- **Real-Time Attendance Tracking**: Punch in/out system with activity states (online, break, meeting, training, etc.)
- **Team Management**: View online team members, send notifications, manage user roles and profiles
- **Leave Management**: Request and approve leave requests with different types (annual, sick, emergency)
- **Quality Assurance**: Conduct evaluations, track scores, and generate performance reports
- **Shift Scheduling**: Upload and manage employee schedules via CSV import
- **Reporting**: Generate daily reports on attendance, attrition, absenteeism, and productivity metrics
- **Role-Based Access**: Hierarchical permissions from agents to owners/admins

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, ES5 JavaScript (no frameworks)
- **Backend**: Supabase (PostgreSQL database with real-time capabilities)
- **Authentication**: Supabase Auth (email/password)
- **Deployment**: Static hosting (GitHub Pages, Netlify, etc.)

## Getting Started

### Prerequisites

- A Supabase account and project
- HTTPS-enabled web server for local development (Supabase requires secure context)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/wfmoptiforce-beep/memo-hr.git
   cd memo-hr
   ```

2. Configure Supabase:
   - Create a new project in Supabase
   - Set up the required tables (see database schema below)
   - Update `config.js` with your Supabase URL and anon key

3. Run locally:
   ```bash
   python3 -m http.server 8000
   ```
   Visit `https://localhost:8000` in your browser (note: HTTPS is required)

### Database Schema

The application uses the following main tables in Supabase:

- `profiles`: User information and roles
- `aux_sessions`: Attendance punch records
- `schedules`: Shift assignments
- `leaves`: Leave requests
- `quality_evaluations`: QA scores and feedback
- `notifications`: In-app messages

Ensure Row Level Security (RLS) policies are configured appropriately for data access control.

## Usage

1. **Login**: Use your email and password to access the system
2. **Dashboard**: View your attendance status, hours worked, and pending tasks
3. **Punch In/Out**: Start and end work sessions with different activity types
4. **Team View**: See who's online and their current status
5. **Admin Functions**: Manage users, schedules, and reports (admin/supervisor roles only)

## Contributing

This project uses vanilla JavaScript with global functions. All new features should follow the existing patterns:
- Expose functions on `window` object
- Use Supabase for data operations
- Handle errors appropriately
- Test with different user roles

## License

[Add your license here]

## Support

For support or questions, contact the development team.</content>
<parameter name="filePath">/workspaces/memo-hr/README.md