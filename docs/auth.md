# Authentication

Recall Link implements a simple email/password user system with cookie-based sessions.

## Approach

- **Session transport**: HttpOnly cookie (`rl_session`)
- **Storage**: token hash stored in SQLite (`sessions.token_hash`)
- **Password hashing**: Node `crypto.scrypt`

## API Endpoints

- `POST /api/auth/register` - Create account + login
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

## Protected Resources

These APIs require authentication and are user-scoped:

- `/api/items`
- `/api/tags`
- `/api/chat/*`
- `/api/items/events`

## CORS Notes (Web)

Because the browser must send cookies, CORS must allow credentials.

Set in `apps/api`:

```bash
WEB_ORIGINS=http://localhost:3000
```
