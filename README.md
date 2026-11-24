# Task Management REST API

A secure, beginner-friendly REST API for managing personal tasks, built with **Node.js**, **Express**, **SQLite** and **JWT authentication**. Each user registers, logs in, and can only ever see and change their own tasks.

## Features

- User registration and login with **bcrypt** password hashing (passwords and hashes are never returned)
- **JWT** authentication middleware (`401` for missing / invalid / expired tokens)
- Full **CRUD** for tasks with filtering (`status`, `priority`) and pagination
- **Ownership checks**: users cannot read, update or delete other users' tasks (`403`)
- Input validation on every write endpoint with clear error messages (**express-validator**)
- Security hardening: **Helmet** headers, configurable **CORS**, parameterized SQL, request size limit
- Consistent JSON responses and central error handling
- SQLite database created automatically on first start (no database server to install)
- Automated tests (**Jest + Supertest**) using an isolated in-memory database
- Ready-to-import **Postman collection**

## Technologies

| Purpose | Package |
| --- | --- |
| Web framework | express |
| Database | SQLite via better-sqlite3 |
| Authentication | jsonwebtoken |
| Password hashing | bcryptjs |
| Validation | express-validator |
| Security headers / CORS | helmet, cors |
| Configuration | dotenv |
| Testing | jest, supertest |

## Prerequisites

- **Node.js 18.12 or newer** (an LTS release such as 20 or 22 is recommended) and npm
- Git (for cloning / uploading to GitHub)
- [Postman](https://www.postman.com/downloads/) (optional, for manual API testing)

> `better-sqlite3` ships prebuilt binaries for current Node LTS versions. On unusual platforms npm may compile it from source, which needs Python and a C++ compiler.

## Installation

```bash
git clone https://github.com/<your-username>/task-management-api.git
cd task-management-api
npm install
```

## Environment variables

Copy the example file and edit it:

```bash
# macOS / Linux / Git Bash
cp .env.example .env
# Windows PowerShell
Copy-Item .env.example .env
```

| Variable | Description | Default / example |
| --- | --- | --- |
| `PORT` | Port the server listens on | `5000` |
| `JWT_SECRET` | **Required.** Secret used to sign tokens. Use a long random string | `replace_with_a_long_random_secret` |
| `JWT_EXPIRES_IN` | Token lifetime (`1d`, `12h`, `30m`, ...) | `1d` |
| `DATABASE_PATH` | SQLite file location (relative to the project root) | `./database.sqlite` |
| `NODE_ENV` | `development`, `production` or `test` | `development` |
| `CORS_ORIGIN` | *Optional.* Comma-separated allowed origins | `*` (all origins) |

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start if `JWT_SECRET` is missing, and in `production` it also rejects the placeholder value or a secret shorter than 32 characters. **Never commit your `.env` file** (it is listed in `.gitignore`).

## Running the server

```bash
npm start        # production-style start
npm run dev      # auto-restart on file changes (Node 18.11+)
```

You should see `Task Management API running in development mode on http://localhost:5000`. Check it with:

```bash
curl http://localhost:5000/health
```

## Database

- Engine: **SQLite** (a single file, default `./database.sqlite`, created automatically).
- Tables are created on startup if they do not exist; foreign key enforcement is turned on for every connection (`PRAGMA foreign_keys = ON`).
- All queries use bound parameters, which prevents SQL injection.
- Timestamps are stored as ISO 8601 strings in UTC.

**users**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment |
| `name` | TEXT | NOT NULL |
| `email` | TEXT | NOT NULL, UNIQUE (case-insensitive) |
| `password_hash` | TEXT | NOT NULL (bcrypt hash) |
| `created_at`, `updated_at` | TEXT | NOT NULL, default current UTC time |

**tasks**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment |
| `user_id` | INTEGER | NOT NULL, foreign key -> `users.id` (`ON DELETE CASCADE`) |
| `title` | TEXT | NOT NULL |
| `description` | TEXT | Optional |
| `status` | TEXT | `pending` (default), `in_progress`, `completed` |
| `priority` | TEXT | `low`, `medium` (default), `high` |
| `due_date` | TEXT | Optional ISO 8601 date, e.g. `2030-12-31` |
| `created_at`, `updated_at` | TEXT | NOT NULL, default current UTC time |

## Project structure

```
task-management-api/
├── config/
│   ├── database.js          # SQLite connection + automatic table creation
│   └── env.js               # Reads and validates environment variables
├── controllers/
│   ├── authController.js    # register, login, profile
│   └── taskController.js    # task CRUD
├── middleware/
│   ├── authMiddleware.js    # JWT verification
│   ├── errorMiddleware.js   # 404 + central error handler
│   └── validateMiddleware.js# Turns validation results into 400 responses
├── models/
│   ├── userModel.js         # SQL for users
│   └── taskModel.js         # SQL for tasks
├── routes/
│   ├── authRoutes.js
│   └── taskRoutes.js
├── validators/
│   ├── authValidator.js
│   └── taskValidator.js
├── utils/
│   ├── asyncHandler.js      # Forwards async errors to the error handler
│   └── response.js          # Consistent JSON response helpers
├── tests/                   # Jest + Supertest tests
├── app.js                   # Express app (used by server and tests)
├── server.js                # Starts the HTTP server
├── jest.config.js
├── postman_collection.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## API reference

Base URL: `http://localhost:5000`

All responses are JSON with a `success` boolean and a `message`.

### Authentication header

Protected endpoints need the token returned by `/api/auth/login`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Endpoint summary

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Create an account |
| POST | `/api/auth/login` | No | Log in and receive a JWT |
| GET | `/api/auth/profile` | Yes | Current user's profile |
| POST | `/api/tasks` | Yes | Create a task |
| GET | `/api/tasks` | Yes | List your tasks (filters + pagination) |
| GET | `/api/tasks/:id` | Yes | Get one of your tasks |
| PUT | `/api/tasks/:id` | Yes | Update one of your tasks |
| DELETE | `/api/tasks/:id` | Yes | Delete one of your tasks |
| GET | `/health` | No | Health check |

### POST /api/auth/register

Rules: `name` required (max 100 chars); `email` valid format; `password` 8-72 characters.

```json
{ "name": "Jane Doe", "email": "jane.doe@example.com", "password": "securePass123" }
```

**201 Created**

```json
{
  "success": true,
  "message": "User registered successfully.",
  "data": {
    "user": { "id": 1, "name": "Jane Doe", "email": "jane.doe@example.com", "created_at": "2026-01-15T10:30:00.123Z" }
  }
}
```

Errors: `400` validation failed, `409` email already registered.

### POST /api/auth/login

```json
{ "email": "jane.doe@example.com", "password": "securePass123" }
```

**200 OK**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { "id": 1, "name": "Jane Doe", "email": "jane.doe@example.com", "created_at": "2026-01-15T10:30:00.123Z" }
  }
}
```

Errors: `400` validation failed, `401` invalid email or password.

### GET /api/auth/profile

**200 OK**

```json
{
  "success": true,
  "message": "Profile retrieved successfully.",
  "data": { "user": { "id": 1, "name": "Jane Doe", "email": "jane.doe@example.com", "created_at": "2026-01-15T10:30:00.123Z" } }
}
```

### POST /api/tasks

| Field | Required | Rules |
| --- | --- | --- |
| `title` | Yes | Non-empty text, max 200 chars |
| `description` | No | Text, max 2000 chars |
| `status` | No | `pending` (default), `in_progress`, `completed` |
| `priority` | No | `low`, `medium` (default), `high` |
| `due_date` | No | Valid ISO 8601 date, e.g. `2030-12-31` or `2030-12-31T17:30:00Z` |

```json
{
  "title": "Finish backend assignment",
  "description": "Build the REST API and write the README",
  "status": "pending",
  "priority": "high",
  "due_date": "2030-12-31"
}
```

**201 Created**

```json
{
  "success": true,
  "message": "Task created successfully.",
  "data": {
    "task": {
      "id": 1,
      "user_id": 1,
      "title": "Finish backend assignment",
      "description": "Build the REST API and write the README",
      "status": "pending",
      "priority": "high",
      "due_date": "2030-12-31",
      "created_at": "2026-01-15T10:35:00.000Z",
      "updated_at": "2026-01-15T10:35:00.000Z"
    }
  }
}
```

### GET /api/tasks

Query parameters (all optional): `status`, `priority`, `page` (default 1), `limit` (default 10, max 100). Results are newest first.

```
GET /api/tasks?status=pending&priority=high&page=1&limit=10
```

**200 OK**

```json
{
  "success": true,
  "message": "Tasks retrieved successfully.",
  "data": { "tasks": [ { "id": 1, "user_id": 1, "title": "Finish backend assignment", "status": "pending", "priority": "high", "...": "..." } ] },
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

### GET /api/tasks/:id

Returns `{ "success": true, "message": "Task retrieved successfully.", "data": { "task": { ... } } }`.
Errors: `400` invalid id, `403` task belongs to another user, `404` not found.

### PUT /api/tasks/:id

Send any subset of `title`, `description`, `status`, `priority`, `due_date` (at least one). Send `null` for `description` or `due_date` to clear them. Unspecified fields keep their current value.

```json
{ "status": "completed", "priority": "low" }
```

Returns `200` with the updated task. Errors: `400`, `403`, `404`.

### DELETE /api/tasks/:id

**200 OK**

```json
{ "success": true, "message": "Task deleted successfully." }
```

Errors: `400`, `403`, `404`.

> **Design note (403 vs 404):** a task that exists but belongs to someone else returns `403`, a task that does not exist returns `404`. This follows the assignment's status-code requirements. A stricter production API might return `404` for both so that task ids can't be probed.

### Error response examples

**400 - validation failed**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email must be a valid email address" },
    { "field": "password", "message": "Password must be at least 8 characters long" }
  ]
}
```

**400 - malformed JSON**

```json
{ "success": false, "message": "Malformed JSON in request body." }
```

**401 - missing or invalid token**

```json
{ "success": false, "message": "Authentication required. Send the header \"Authorization: Bearer <token>\"." }
```

```json
{ "success": false, "message": "Invalid or expired token." }
```

**403 - not your task**

```json
{ "success": false, "message": "You do not have permission to access this task." }
```

**404 - not found**

```json
{ "success": false, "message": "Task not found." }
```

**409 - duplicate email**

```json
{ "success": false, "message": "An account with this email already exists." }
```

**500 - unexpected error** (details are only written to the server log)

```json
{ "success": false, "message": "Internal server error." }
```

### Quick test with curl

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane.doe@example.com","password":"securePass123"}'

# 2. Log in and copy the token from the response
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.doe@example.com","password":"securePass123"}'

# 3. Create a task
curl -X POST http://localhost:5000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste-token-here>" \
  -d '{"title":"My first task","priority":"high"}'
```

## Testing with Postman

1. Start the server (`npm start`).
2. In Postman choose **Import** and select `postman_collection.json`.
3. The collection variable `baseUrl` is `http://localhost:5000` (change it on the collection's **Variables** tab if you use another port).
4. Run **Auth -> Register**, then **Auth -> Login**. The Login request's test script saves the JWT into the `token` collection variable.
5. The collection is configured with **Bearer Token auth = `{{token}}`**, so every protected request sends `Authorization: Bearer <token>` automatically.
6. Run **Tasks -> Create Task** (it stores `taskId`), then List, Get, Update and Delete in order.
7. The **Error examples** folder shows a `400` validation error and a `401` request without a token.

Re-running Register with the same email returns `409`; that is expected and the request's test accepts it.

## Running the automated tests

```bash
npm test                 # run all tests
npm run test:coverage    # with a coverage report
```

Tests use `tests/setup.js` to set `NODE_ENV=test`, a test-only `JWT_SECRET`, and `DATABASE_PATH=:memory:`, so they run against a throw-away in-memory SQLite database and **never touch your development data**.

What is covered: registration (success, validation, duplicates, hashing), login (success, wrong password, unknown email), authentication middleware (missing, malformed, invalid, forged, expired tokens), task create / list (filters, pagination) / get / update / delete, ownership protection (`403`), `404` handling, invalid ids and input, SQL-injection attempts, and database constraints (foreign keys, unique email, cascade delete).

## Security notes

- Passwords are hashed with bcrypt (10 salt rounds) and never returned by any endpoint.
- Login returns the same error for an unknown email and a wrong password, and performs a dummy hash comparison to reduce timing differences.
- JWTs are signed with HS256, verified with an explicit algorithm allow-list, and the user is re-checked in the database on each request.
- A `user_id` sent in a request body is ignored; ownership always comes from the token.
- Helmet sets secure headers; the JSON body size is limited to 10 KB; CORS origins can be restricted with `CORS_ORIGIN`.
- Ideas for further hardening: rate limiting on `/api/auth/*`, refresh tokens, HTTPS termination in front of the app.

## Uploading to GitHub

1. Create a new **empty public repository** on GitHub (do not add a README or .gitignore there).
2. From the project folder run:

```bash
git init
git add .
git status          # confirm .env, node_modules/ and *.sqlite files are NOT listed
git commit -m "Initial commit: Task Management REST API"
git branch -M main
git remote add origin https://github.com/<your-username>/task-management-api.git
git push -u origin main
```

Or, with the GitHub CLI (`gh auth login` first):

```bash
gh repo create task-management-api --public --source=. --remote=origin --push
```

## License

MIT
