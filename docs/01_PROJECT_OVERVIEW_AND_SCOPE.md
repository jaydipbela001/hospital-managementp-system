# Hospital Management System (HMS) --- Project Overview and Scope

## 1. Project goal

Build a production-minded, responsive, web-based Hospital Management
System for an MCA final-year project. The system centralizes hospital
administration and patient-care workflows. It must be developed
incrementally: **one phase/module at a time**, with working code, tests,
and documentation before moving to the next phase.

This is an academic project, not a certified clinical system. Do not
claim legal, medical, ABDM, or regulatory compliance without a separate
verified assessment. Use demo data during development.

## 2. Technology stack (fixed)

### Frontend

-   React.js with Vite
-   JavaScript (ES modules; do not convert to TypeScript unless
    explicitly requested)
-   Vanilla CSS (CSS variables and modular stylesheets)
-   GSAP for intentional timeline/scroll animations
-   Motion (Framer Motion package, if the project chooses `motion`) for
    component transitions and micro-interactions
-   React Router for routing
-   Fetch or Axios; choose one and use it consistently

### Backend

-   Node.js + Express.js
-   JavaScript ES modules
-   MongoDB Atlas with Mongoose
-   NodeMailer for transactional email
-   Firebase Admin SDK for Firebase Cloud Messaging (FCM) push
    notifications

### Deployment

-   Frontend and backend are separate Vercel projects.
-   Frontend: Vite static build deployed to Vercel.
-   Backend: Express app exposed as a Vercel serverless function. Do not
    start a persistent HTTP listener on Vercel.
-   Database: MongoDB Atlas.
-   Secrets are configured in Vercel Environment Variables, never
    committed to Git.

## 3. User roles

Implement authorization on the server, not only by hiding frontend
buttons.

1.  **Super Admin** --- system-wide configuration, user/role management,
    dashboards and audit access.
2.  **Hospital Admin** --- hospital operations, staff, departments,
    reports and settings.
3.  **Receptionist** --- patient registration, appointment scheduling
    and check-in.
4.  **Doctor** --- assigned appointments, patient encounters, diagnoses
    and prescriptions.
5.  **Nurse** --- assigned ward/patient observations and nursing notes.
6.  **Pharmacist** --- medicine catalogue, stock, dispensing and
    purchase records.
7.  **Lab Technician** --- test orders, sample status and result entry.
8.  **Patient** --- own profile, appointments, prescriptions, reports
    and bills.

A small academic deployment may combine Super Admin and Hospital Admin,
but retain clear role permissions in the design.

## 4. Functional modules

### Core modules

-   Authentication and role-based access control
-   Dashboard and hospital configuration
-   Patient registration and patient profile
-   Doctor, staff and department management
-   Doctor schedules and appointment management
-   OPD visit / consultation
-   IPD admission, ward, room and bed allocation
-   Medical records, diagnosis and prescriptions
-   Laboratory catalogue, orders, samples and results
-   Pharmacy catalogue, inventory, dispensing and expiry tracking
-   Billing, invoices, payments, refunds and receipts
-   Discharge summary and follow-up
-   Notifications (email and push)
-   Reports, analytics and audit logs

### Optional/advanced modules (after core modules work)

-   Emergency / triage
-   Operation theatre and surgery scheduling
-   Insurance and claim tracking
-   Blood bank
-   Ambulance
-   Diet and meal planning
-   Housekeeping and maintenance
-   Medical equipment management
-   Staff attendance, leave and payroll
-   Patient feedback and complaints
-   QR code patient identification

Do not attempt all optional modules at the start. Add them only after
the core workflow is stable.

## 5. Main end-to-end workflows

### OPD workflow

Patient registration/search → appointment booking or walk-in → check-in
→ doctor consultation → diagnosis → prescription and/or lab order →
pharmacy/lab processing → invoice/payment → follow-up.

### IPD workflow

Patient registration → admission request → ward/room/bed allocation →
doctor and nurse care records → investigations and medication → charges
→ discharge approval → discharge summary → final invoice/payment → bed
marked available after discharge is completed.

### Laboratory workflow

Doctor creates test order → lab receives order → sample collected →
sample processing → result entered → result verified/approved by
authorized role → report available to doctor/patient.

### Pharmacy workflow

Doctor prescription → pharmacist reviews → stock/batch availability
check → medicine dispensed → inventory transaction recorded → medicine
charge added to bill.

### Emergency workflow (advanced phase)

Emergency registration → triage priority → immediate care and staff
assignment → admission/transfer/discharge → billing and records. Do not
use the app to make clinical triage decisions.

## 6. Non-functional requirements

-   Responsive layout for mobile, tablet and desktop.
-   Accessible labels, keyboard navigation, visible focus and sufficient
    contrast.
-   Server-side validation for every write operation.
-   Consistent API response and error format.
-   Pagination, filtering and sorting for large lists.
-   Loading, empty, success and error states on every data screen.
-   Secure password hashing with bcrypt or argon2.
-   JWT access-token strategy with secure handling; never store secrets
    in frontend code.
-   Role and resource-level authorization (for example, a patient can
    access only their own records).
-   Audit important actions, especially medical-record changes.
-   Do not log passwords, tokens, OTPs or sensitive medical information.
-   Backups and restore procedure documented.
-   Store dates consistently (UTC in database; display in the user's
    configured timezone).
-   Never hard-delete clinical or financial records casually; use
    status/archival policies and audit history.

## 7. Scope discipline

The coding agent must: 1. Inspect the existing repository before
changing it. 2. Confirm current phase and read the phase plan. 3.
Implement **only the requested phase**. 4. Avoid generating all modules
in one response or one large code dump. 5. Keep existing working code
intact. 6. Provide changed-file list, commands, environment variables,
test results and manual verification steps. 7. Stop and ask before
introducing a new major dependency, changing the stack, or changing an
agreed API/data model.
