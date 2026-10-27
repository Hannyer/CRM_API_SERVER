# Backend security corrections

## Deployment requirements

- Set a separate random `JWT_SECRET` of at least 32 characters for each Render service. Startup rejects missing, short and known public values. Keep the value out of Git.
- Set `NODE_TLS_REJECT_UNAUTHORIZED=1` or remove an existing value of `0` before deploying. Node's default validates TLS certificates.
- The Supabase root CA is bundled under `src/config/certificates/supabase-root.crt`, downloaded from the Supabase distribution endpoint over verified HTTPS. Its certificate expires on 26 April 2031. Renew it before expiry or when the provider announces a CA rotation. Other PostgreSQL providers use Node's normal trust store; `DATABASE_SSL_CA` can supply an explicit PEM bundle when required.
- Database connections verify the certificate and hostname. URL SSL parameters are removed so they cannot replace the validated TLS options. Local development can use a non-TLS localhost connection; production cannot disable TLS.
- `CORS_ORIGINS` accepts a comma-separated list of browser origins. It defaults to `FRONTEND_URL` when provided, otherwise to the existing frontend and local development origin. Confirm the deployed frontend URL before release.
- On Render, one proxy hop is trusted. Override `TRUST_PROXY_HOPS` only to match a verified proxy layout. Never trust arbitrary forwarded IP headers.

## User-visible behavior

Existing sessions must sign in again after this release. Passwords do not change. New passwords use scrypt with random salts (N=32768, r=8, p=3). Legacy encrypted passwords are verified and upgraded on a successful login, using a conditional update to avoid overwriting a concurrent password change. Existing legacy passwords shorter than the current minimum can migrate without blocking login; new password writes enforce at least six characters and a maximum of 1024 UTF-8 bytes.

Each authenticated request verifies that the user and role remain active and that the session fingerprint matches the current password and role. Password/role changes and deactivation invalidate prior sessions. An unavailable session store returns a generic 503 rather than allowing access.

Authenticated catalog reads remain available to populate selectors. Catalog mutations require the owning module's permission: activity types use `activities`, companies use `companies`, configuration/payment/card types use `settings`, and languages use `users`. Permission-matrix changes require `security`. Disabled permissions are rejected. Users may read their own dynamic menu; reading another role's menu requires the security read permission.

Reservations returning from cancelled to pending/confirmed recheck capacity under the schedule lock. Transport assignment verifies vehicle capacity and the active configured driver role, and repeats these checks under transaction locks before replacing the prior assignment. Overlapping transport schedules still follow existing product behavior; this release does not introduce a new policy about sharing trips between bookings.

Password recovery consumes the token and updates the password in one conditional SQL operation. Only one concurrent consume can succeed.

## Limits and operations

- All authentication endpoints together: 60 requests per IP per 15 minutes.
- Login and password-reset submission: 10 attempts per IP and account per 15 minutes (shared limiter for these two endpoints).
- Recovery email requests: 3 attempts per IP and account per 15 minutes.
- Excess attempts return 429 with Retry-After. The bounded in-memory limiter is for the current single-instance deployment. It resets on restart; use a shared store before scaling to multiple instances.
- Unexpected server errors return generic public messages. Internal details remain in server logs; known validation errors retain useful responses.
- No schema migration or bulk password rewrite is required. Before release, verify the existing app_user password reset columns and role configuration already required by the current application.
- Once legacy passwords have been upgraded, rolling back to code that understands only reversible encrypted passwords will prevent those users from logging in. Fix forward or retain the dual-format password verifier in any rollback.

## Validation

Run `npm run lint` and `npm test`. Regression tests use synthetic identities and mock database boundaries, including CORS over localhost. They do not replace staging checks against PostgreSQL for real lock contention and constraint interactions.

GitHub Actions runs npm ci, lint and tests on push and pull request. The private subscription package needs read access to GitHub Packages. The workflow uses a repository `NPM_TOKEN` secret when present, otherwise its packages-read GitHub token. Grant that repository access to the package if its package settings restrict installations.

The PROD monitoring endpoint and five-minute schedule do not change in this release.

CA source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Provider guidance: https://supabase.com/docs/guides/platform/ssl-enforcement
