# HMS --- Production-Oriented Architecture, API and Database Guide

## 1. Repository strategy

Use a monorepo with separate frontend and backend folders. Deploy each
folder as a separate Vercel project.

``` text
hospital-management-system/
  client/                         # Vite React app; Vercel project 1
  server/                         # Express API; Vercel project 2
  docs/                            # project documentation
  .gitignore
  README.md
```

### Frontend structure

``` text
client/
  public/
  src/
    app/
      App.jsx
      router.jsx
      providers/
    assets/
    components/
      common/
    features/
      auth/
      dashboard/
      patients/
      doctors/
      appointments/
      departments/
      opd/
      ipd/
      pharmacy/
      laboratory/
      billing/
      notifications/
    layouts/
    hooks/
    services/
      apiClient.js
    styles/
      tokens.css
      reset.css
      global.css
      utilities.css
    utils/
    main.jsx
  index.html
  vite.config.js
  vercel.json
  package.json
  .env.example
```

Keep each feature self-contained. Example `features/patients/` can
contain `pages/`, `components/`, `services/`, `hooks/`, `schemas/` and
`styles/`.

### Backend structure

``` text
server/
  api/
    index.js                     # Vercel serverless entry; exports Express app
  src/
    app.js                        # creates/configures Express app
    config/
      env.js
      database.js
      firebase.js
      mailer.js
    modules/
      auth/
      users/
      roles/
      patients/
      doctors/
      departments/
      appointments/
      opd/
      ipd/
      pharmacy/
      laboratory/
      billing/
      notifications/
    middleware/
      authenticate.js
      authorize.js
      validate.js
      errorHandler.js
      notFound.js
      rateLimit.js
    models/
    routes/
    services/
    utils/
      ApiError.js
      asyncHandler.js
      pagination.js
      audit.js
    validators/
  scripts/
  tests/
  vercel.json
  package.json
  .env.example
```

Use feature/module boundaries. Avoid putting all routes, models and
controllers in one enormous file. A module may contain routes,
controller, service, model and validation schema.

## 2. Express application and Vercel serverless

Vercel serverless functions are request-driven. Do **not** call
`app.listen()` in the deployed serverless entry point.

Example `server/src/app.js`:

``` js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { apiRouter } from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(",") ?? [],
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "API is healthy" });
});

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
```

Example `server/api/index.js`:

``` js
import app from "../src/app.js";

export default app;
```

Example `server/vercel.json` (verify current Vercel configuration syntax
during deployment):

``` json
{
  "version": 2,
  "rewrites": [
    { "source": "/(.*)", "destination": "/api" }
  ]
}
```

Keep the Vercel function entry under `api/`. Confirm the rewrite and
runtime behavior against the current Vercel Node.js Functions
documentation when deploying. Do not create a custom persistent server
on Vercel.

For local development only, create `server/src/local.js`:

``` js
import app from "./app.js";

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Local API listening on ${port}`);
});
```

The Vercel entry must export the app and must not import `local.js`.

## 3. MongoDB connection management

-   Use MongoDB Atlas with network access configured securely.
-   Cache the Mongoose connection across warm serverless invocations
    using a module-level cached promise/connection.
-   Do not connect to MongoDB separately in every controller.
-   Fail clearly if `MONGODB_URI` is missing.
-   Set sensible server selection and connection timeouts.
-   Do not expose database credentials to the frontend.
-   Use indexes for frequently queried fields and unique identifiers.
-   Add pagination to collection endpoints.
-   Avoid unbounded `find()` calls.

Connection helper pattern:

``` js
import mongoose from "mongoose";

let cached = globalThis.__mongooseCache;
if (!cached) {
  cached = globalThis.__mongooseCache = { conn: null, promise: null };
}

export async function connectDatabase() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    }).then((instance) => instance);
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}
```

Call `await connectDatabase()` before database-backed route handling
(for example, in a small async wrapper/middleware or each module's
service boundary). Ensure concurrent requests reuse the cached promise.

## 4. API conventions

-   Prefix all routes with `/api/v1`.
-   Use nouns and HTTP methods consistently.
-   Validate params, query strings and request bodies.
-   Use status codes correctly.
-   Use one common response structure.

Success:

``` json
{
  "success": true,
  "message": "Patient created successfully",
  "data": {},
  "meta": null
}
```

Error:

``` json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "phone", "message": "Phone is required" }]
}
```

List:

``` json
{
  "success": true,
  "message": "Patients fetched successfully",
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

Suggested initial endpoints (implement only in the relevant phase):

### Auth

-   `POST /api/v1/auth/register` (only if public patient registration is
    enabled)
-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/refresh` (only if refresh-token design is
    implemented)
-   `POST /api/v1/auth/logout`
-   `POST /api/v1/auth/forgot-password`
-   `POST /api/v1/auth/reset-password`

### Users and roles

-   `GET /api/v1/users/me`
-   `GET /api/v1/users`
-   `PATCH /api/v1/users/:id/status`
-   `GET /api/v1/roles`

### Patients

-   `POST /api/v1/patients`
-   `GET /api/v1/patients`
-   `GET /api/v1/patients/:id`
-   `PATCH /api/v1/patients/:id`
-   `GET /api/v1/patients/:id/visits`

### Doctors and appointments

-   `GET /api/v1/doctors`
-   `POST /api/v1/doctors`
-   `GET /api/v1/doctors/:id/availability`
-   `POST /api/v1/appointments`
-   `GET /api/v1/appointments`
-   `PATCH /api/v1/appointments/:id/status`
-   `PATCH /api/v1/appointments/:id/reschedule`

## 5. Initial data model guidance

Use MongoDB references for separately managed entities and embedded
subdocuments for small, bounded data that is always read/updated with
the parent. Do not duplicate large medical histories into a patient
document.

Core collections: - `users`: email/phone, passwordHash, role, status,
lastLoginAt. - `roles`: role key, permissions. - `patients`:
patientCode, userId (optional), name, dateOfBirth, gender (only fields
needed), contact, address, emergencyContact, allergies summary,
status. - `doctors`: userId, doctorCode, departmentId, qualifications,
specialization, consultationFee, status. - `departments`: name, code,
description, status. - `doctorSchedules`: doctorId, weekday/date,
startTime, endTime, slotDuration, exceptions. - `appointments`:
appointmentCode, patientId, doctorId, departmentId, startAt, endAt,
status, reason, createdBy. - `visits`: patientId, doctorId,
appointmentId, visitAt, notes, diagnosis, followUpAt. - `admissions`:
patientId, admissionCode, admittedAt, dischargeAt, wardId, bedId,
status. - `wards`, `rooms`, `beds`: capacity and availability/status. -
`prescriptions`: patientId, doctorId, visitId, items, instructions,
status. - `medicines`: medicineCode, name, category, reorderLevel,
status. - `medicineBatches`: medicineId, batchNumber, expiryDate,
quantity, purchasePrice, sellingPrice. - `labTests`: testCode, name,
sampleType, price, status. - `labOrders`: patientId, doctorId, visitId,
items, sampleStatus, resultStatus. - `invoices`: patientId,
visitId/admissionId, lineItems, subtotal, discount, tax, total,
status. - `payments`: invoiceId, amount, method, transactionReference,
status, paidAt. - `notifications`: userId, channel, title, body, status,
sentAt, failureReason. - `auditLogs`: actorId, action, resourceType,
resourceId, timestamp, safe metadata.

Use timestamps (`createdAt`, `updatedAt`) and status enums where useful.
Define indexes and unique constraints thoughtfully. Example: unique
`patientCode`, unique `doctorCode`, and carefully designed appointment
indexes.

## 6. Security baseline

-   Hash passwords with bcrypt/argon2; never store plaintext.
-   Validate and normalize email, phone and user input.
-   Use rate limits on login, password reset and OTP endpoints.
-   Use secure, httpOnly, sameSite cookies if using cookie-based auth;
    configure CORS and credentials correctly. If using bearer tokens,
    protect token storage and document the trade-offs.
-   Never trust a role or userId sent by the browser; derive identity
    from verified authentication.
-   Add object-level authorization to patient records, prescriptions,
    lab results and invoices.
-   Sanitize/validate file uploads; restrict size, type and storage
    location.
-   Keep Firebase service credentials and SMTP credentials server-side.
-   Do not send sensitive patient details in push notification bodies or
    email subject lines.
-   Audit critical changes.
-   Use TLS in production.
-   Do not expose stack traces or database errors to clients.

## 7. File uploads

For production, prefer direct signed uploads to object storage (for
example, S3) rather than buffering large files in a Vercel function.
Store file metadata and access controls in MongoDB. Do not store large
binary files in MongoDB documents. For a small local demo, a temporary
local upload approach may be used but must not be treated as durable
Vercel storage.

## 8. Observability and reliability

-   Structured logs with request ID.
-   Central error middleware.
-   Health endpoint that can optionally check database connectivity.
-   Avoid logging PHI/PII, tokens or secrets.
-   Configure timeouts and payload limits.
-   Retry only safe/idempotent external operations.
-   Email/push failure must not silently undo a successful patient
    registration or appointment. Persist notification status and report
    failures for retry.
