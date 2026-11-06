# HMS --- Coding Agent Instructions and Step-by-Step Implementation Plan

## 1. Mandatory instruction to the coding agent

You are implementing an MCA final-year Hospital Management System using
the stack and design rules in the other project documents.

**Do not create the entire application at once. Work phase by phase.**
At the start of every task: 1. Read all project documents in `/docs`. 2.
Inspect the existing repository, package files and current
implementation. 3. Identify the current phase and what is already
complete. 4. State a short plan and list files likely to change. 5.
Implement only the requested phase. 6. Run lint/build/tests (or explain
which are not configured). 7. Fix errors caused by your changes. 8.
Summarize completed work, API routes, database changes, environment
variables, commands and manual test steps. 9. Stop. Do not begin the
next phase until the user asks.

Do not overwrite existing files blindly. Do not invent completed
features. Do not use fake API responses in production paths. Do not put
secrets in source code. Do not hardcode theme colors in component CSS.

## 2. Phase-by-phase roadmap

### Phase 0 --- Repository inspection and project foundation

-   Inspect repository and report current state.
-   Create monorepo folders `client`, `server`, `docs` only if missing.
-   Initialize Vite React JavaScript frontend and Express JavaScript
    backend only if missing.
-   Configure ES modules consistently.
-   Add `.gitignore`, `.env.example`, README and basic scripts.
-   Add health endpoint and minimal frontend landing page.
-   Add a basic test/build check. **Acceptance:** frontend runs locally;
    backend `/api/health` works locally; no real secrets committed.

### Phase 1 --- Global design system and application shell

-   Add global CSS tokens, reset, typography and responsive utilities
    from design guide.
-   Build reusable Button, Input, Select, Badge, Modal, Loader,
    EmptyState, PageHeader and ConfirmDialog.
-   Build responsive AdminLayout with sidebar, top bar, profile menu and
    mobile navigation.
-   Build Login page visual structure (authentication logic comes in
    Phase 2).
-   Add route placeholders only for agreed modules. **Acceptance:**
    theme can be changed by editing tokens; layouts work at 360px, 768px
    and desktop; no hardcoded color values in component CSS.

### Phase 2 --- Authentication and authorization

-   User model and role/permission model.
-   Login, logout, current-user endpoint, password hashing and
    validation.
-   Secure token/cookie strategy documented and implemented.
-   Authentication and authorization middleware.
-   Frontend protected routes and role-aware navigation.
-   Seed a development Super Admin safely through a script, not a public
    default-password endpoint. **Acceptance:** unauthenticated users
    cannot access protected APIs; each role is restricted; passwords are
    hashed; invalid login is rate-limited.

### Phase 3 --- Hospital setup and user/staff management

-   Hospital profile/settings (single hospital first).
-   Departments CRUD.
-   Staff/user CRUD and role assignment.
-   Doctor profile and specialization.
-   Search, filters, pagination and audit events. **Acceptance:**
    authorized admin can manage staff/departments; validation and server
    authorization work.

### Phase 4 --- Patient management

-   Patient registration and unique patient code.
-   Patient list, search, filters, pagination and profile.
-   Edit contact details and emergency contact.
-   Allergies and relevant medical history fields.
-   Document metadata/upload strategy (do not store large files in
    MongoDB).
-   Patient access control. **Acceptance:** duplicate/invalid data
    handled; patient can access only own permitted profile;
    admin/receptionist permissions work.

### Phase 5 --- Doctor schedules and appointment management

-   Doctor weekly availability and date exceptions.
-   Available slot calculation.
-   Appointment booking, confirmation, cancellation and rescheduling.
-   Prevent overlapping bookings using server-side checks and
    appropriate database strategy.
-   Appointment statuses and audit history. **Acceptance:** unavailable
    slots cannot be double-booked; patient/receptionist sees correct
    appointments; doctor sees assigned schedule.

### Phase 6 --- OPD consultation and medical records

-   Check-in and visit creation.
-   Doctor consultation notes.
-   Diagnosis and follow-up.
-   Prescription creation and printable PDF.
-   Medical record access control and audit history. **Acceptance:**
    only assigned/authorized clinicians can create or view clinical
    notes; patient can view released records permitted by policy.

### Phase 7 --- IPD, wards, rooms and beds

-   Admission and discharge workflow.
-   Ward, room and bed management.
-   Bed allocation, transfer and availability.
-   Nursing observations and care notes.
-   Discharge summary. **Acceptance:** one bed cannot be allocated to
    two active admissions; bed is released only after valid discharge.

### Phase 8 --- Laboratory management

-   Test catalogue and charges.
-   Doctor test orders.
-   Sample collection/status tracking.
-   Result entry, verification and report.
-   Patient/doctor report access. **Acceptance:** result status
    transitions are validated; only authorized lab roles can
    enter/verify results.

### Phase 9 --- Pharmacy and inventory

-   Medicine catalogue and categories.
-   Suppliers and purchase records.
-   Batch, stock, expiry and reorder level.
-   Dispensing against prescription.
-   Inventory transaction history and returns. **Acceptance:** stock
    cannot go negative; expired batches are blocked from dispensing; all
    stock changes are traceable.

### Phase 10 --- Billing and payments

-   Invoice line items for consultation, lab, medicine, room and other
    configured charges.
-   Discounts/tax configuration with clear calculation rules.
-   Advance, partial and full payments.
-   Receipts, refunds and outstanding balance.
-   Payment gateway only if explicitly approved as a later integration.
    **Acceptance:** totals are calculated on backend; payment records
    are auditable; duplicate payment callbacks are idempotent.

### Phase 11 --- Email, Firebase push and in-app notifications

-   Reusable NodeMailer service.
-   Firebase client setup and service-worker setup for web push.
-   Firebase Admin server integration.
-   Device-token registration/deactivation and multi-device handling.
-   Notification preferences, in-app notification list and read status.
-   Safe templates without sensitive health information. **Acceptance:**
    channel failures are isolated and logged; invalid FCM tokens are
    deactivated; notifications are tested using test accounts.

### Phase 12 --- Dashboard, reports and audit

-   Role-specific dashboard.
-   Real database-backed KPIs.
-   Date filters and exports.
-   Audit-log search with restricted access. **Acceptance:** no
    fabricated metrics; large reports are paginated or generated safely.

### Phase 13 --- Optional advanced modules

Choose one at a time: emergency/triage, operation theatre, insurance,
blood bank, ambulance, diet, housekeeping, equipment, staff
attendance/payroll, feedback or QR identification. Each must have a
defined workflow, data model, permissions, API, UI, tests and
documentation before implementation.

### Phase 14 --- QA, hardening and deployment

-   Unit/integration tests for critical flows.
-   Validation, rate limits, security headers, CORS and authorization
    review.
-   Accessibility and responsive checks.
-   Error/loading/empty states.
-   MongoDB indexes and query review.
-   Environment configuration and Vercel deployment.
-   Preview testing, production checklist, backup and rollback plan.
    **Acceptance:** production build succeeds; frontend and API deploy
    separately; secrets remain server-side; core workflows pass
    end-to-end testing.

## 3. Code quality rules

### Frontend

-   Functional React components and hooks.
-   Keep components small and focused.
-   Put API calls in feature service files or a shared API client.
-   Do not place large business logic in JSX.
-   Use reusable form controls and consistent validation.
-   Use semantic HTML and accessible labels.
-   Keep CSS scoped by component or feature; global tokens remain
    centralized.
-   Avoid unnecessary animation and duplicate animation libraries on the
    same element.

### Backend

-   Separate routes, controllers, services, models and validators.
-   Controllers handle HTTP input/output; services contain business
    rules.
-   Validate request body, params and query.
-   Use centralized async error handling.
-   Use authorization checks in every protected resource endpoint.
-   Use database indexes and pagination.
-   Never trust client-supplied role, price, total, ownership or status.
-   Use transactions where multi-document consistency is required and
    supported by the chosen MongoDB deployment.
-   Record audit events for important changes.

### General

-   Prefer readable code over clever abstractions.
-   Use clear naming and consistent formatting.
-   Avoid unnecessary packages.
-   Do not leave TODOs for required acceptance criteria.
-   Never claim a feature is complete unless it is implemented and
    tested.
-   Update docs when routes, environment variables or workflows change.

## 4. Definition of done for every phase

A phase is complete only when: - Frontend screens are connected to real
backend endpoints where applicable. - Server-side validation and
authorization are present. - Loading, empty, success and error states
exist. - Responsive layout is checked. - Relevant tests pass. - Build
passes. - Environment variables are documented. - API and data-model
changes are documented. - The agent provides manual test instructions. -
No unrelated future phase has been started.

## 5. How the user should instruct the agent

Start with: \> Read all five HMS project documents. Inspect my existing
repository and perform Phase 0 only. Do not implement Phase 1 or any
business modules yet. First report the repository findings and
implementation plan. Then make only the Phase 0 changes, run checks, and
summarize the result.

For later work, request one phase explicitly: \> Continue with Phase 1
only, following the project documents and the definition of done. Do not
start Phase 2.
