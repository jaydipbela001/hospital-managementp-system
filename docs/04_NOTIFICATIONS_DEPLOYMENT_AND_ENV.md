# HMS --- Email, Firebase Push, Environment and Vercel Deployment

## 1. Notification design

Use a central notification service. Business modules should request a
notification; they should not each create their own SMTP or Firebase
logic.

Example interface:

``` js
await notificationService.send({
  userId,
  type: "APPOINTMENT_CONFIRMED",
  channels: ["email", "push"],
  data: { appointmentId },
});
```

The notification service should: 1. Load the user's allowed
contact/device information. 2. Check notification preferences and
consent. 3. Build a template using safe, minimal content. 4. Send email
through NodeMailer when email is enabled. 5. Send push through Firebase
Admin / FCM when a registered device token exists. 6. Save delivery
status, provider response and timestamps in the `notifications`
collection. 7. Handle each channel independently; email failure must not
prevent push attempt. 8. Never put diagnosis, test results, medication
details or other sensitive health information in push previews or email
subject lines. Direct the user to the authenticated portal.

Suggested notification types: - Appointment booked / confirmed /
rescheduled / cancelled - Appointment reminder - Lab report ready
(generic message only) - Invoice generated / payment receipt - Admission
/ discharge update - Password reset / account security

## 2. NodeMailer

-   Use SMTP credentials stored only in backend environment variables.
-   Create one reusable transporter in `src/config/mailer.js`.
-   Verify SMTP configuration in a controlled startup/health check, not
    on every request.
-   Use HTML and plain-text templates.
-   Set a real verified sender address in production.
-   Add retry/error logging and save send status.
-   Do not expose SMTP username/password to the client.
-   For local development, use a test SMTP inbox or sandbox provider.

Example environment keys:

``` env
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM="Hospital Management System <no-reply@example.com>"
```

## 3. Firebase Cloud Messaging

-   Create a Firebase project and configure the web app.
-   Frontend uses Firebase client SDK to request permission and obtain
    an FCM registration token.
-   Frontend sends the token to an authenticated backend endpoint.
-   Backend stores token per user/device with `lastSeenAt`, platform and
    active status.
-   Backend uses Firebase Admin SDK with a service account or supported
    workload credentials.
-   Store service account credentials as Vercel secrets; do not commit
    JSON key files.
-   Remove/disable tokens when FCM reports them as unregistered/invalid.
-   A user may have multiple devices; do not store only one token if
    multi-device support is required.
-   Notification permission is optional; app functionality must still
    work if denied.
-   Use a service worker for web push as required by Firebase's current
    web setup.

Suggested endpoints: - `POST /api/v1/notifications/devices` ---
register/update current device token. -
`DELETE /api/v1/notifications/devices/:id` --- deactivate token. -
`GET /api/v1/notifications` --- list current user's notifications. -
`PATCH /api/v1/notifications/:id/read` --- mark as read. -
`PATCH /api/v1/notification-preferences` --- update preferences.

## 4. Environment variables

### Frontend `.env.example`

``` env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

Vite variables are public in the browser bundle. Only Firebase web
configuration intended for public client use belongs here. Never put
SMTP password, MongoDB URI, Firebase Admin private key, JWT secret or
payment secret in `VITE_*`.

### Backend `.env.example`

``` env
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
MAIL_FROM=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Add only if a later phase implements payment gateway integration
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Do not use real secrets in `.env.example`. Commit only examples, never
actual `.env` files.

## 5. Vercel deployment plan

Create two Vercel projects from the same Git repository.

### Project A --- frontend

-   Root Directory: `client`
-   Framework preset: Vite
-   Build command: `npm run build`
-   Output directory: `dist`
-   Add `VITE_API_BASE_URL` pointing to the deployed backend API base
    URL.
-   Add SPA rewrite so React Router routes resolve to `index.html`.

Example `client/vercel.json`:

``` json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Project B --- backend

-   Root Directory: `server`
-   Deploy the Express application through `api/index.js` as a Vercel
    Node.js Function.
-   Configure the backend `vercel.json` rewrite to route API requests to
    the function. Verify the exact configuration against current Vercel
    documentation and test `/api/health`.
-   Do not run `app.listen()` in the Vercel function.
-   Set all backend environment variables in Vercel for Development,
    Preview and Production as appropriate.
-   Set `CLIENT_ORIGIN` to the exact frontend production origin (and
    approved preview origins if needed).
-   Set MongoDB Atlas network access and database user permissions
    securely. Avoid opening Atlas to the entire internet unless there is
    no supported alternative and the risk is understood.

### Final verification

-   Frontend loads at production URL.
-   Refreshing a nested React route works.
-   Frontend API calls reach backend.
-   CORS permits only expected origins.
-   `/api/health` works.
-   MongoDB connection is reused and stable.
-   Login, authorization and logout work.
-   Email and push notifications work in a controlled test.
-   No secrets appear in browser source, Git history or logs.
-   Test on mobile and desktop.

## 6. Vercel serverless limitations to plan for

-   Functions are not persistent servers; instances can sleep or be
    recycled.
-   Do not depend on in-memory state, local files or timers for durable
    work.
-   Do not run cron-like jobs with `setInterval`; use a managed
    scheduler/cron service if a later phase needs scheduled reminders.
-   Do not assume a function can process long-running uploads or jobs;
    use object storage and background services for heavier tasks.
-   Keep API responses efficient and within the platform's current
    execution limits.
-   External notification delivery can be delayed or fail; persist
    jobs/status and design retry handling.
-   Verify current Vercel function duration, region, runtime and
    configuration limits before production deployment because platform
    limits can change.

## 7. Deployment safety

Deploy a working phase to Preview first. Test it with demo data, then
promote to Production. Never test destructive database migrations or
bulk deletes on production data. Maintain a backup and rollback plan.
