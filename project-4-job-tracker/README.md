# Project 4: Job Application Tracker

A full-stack web application for tracking job applications by company, job title, application date, and status. Built during my Full-Stack Development Internship at DecodeLabs.

**Current status:** completed, deployed, and verified online on October 16, 2026.

## Live Demo

- **Website:** [Job Application Tracker](https://decodelabs-job-tracker.onrender.com)
- **Applications API:** [GET /api/applications](https://decodelabs-job-tracker.onrender.com/api/applications)
- **Health check:** [GET /api/health](https://decodelabs-job-tracker.onrender.com/api/health)

The website and API are hosted together on Render. Application records are stored in PostgreSQL on Neon. Free hosting may take a short time to wake up after inactivity. This is a shared demo; use sample applications.

## Features

- Create, view, update, and delete job applications.
- Track four statuses: Applied, Interview, Offer, and Rejected.
- View summary cards for Total, Applied, Interview, and Offer.
- Search by company or job title without case sensitivity.
- Combine text search with a status filter.
- Show how many records match the current search and filter.
- Store records in PostgreSQL so they remain after a page refresh.
- Validate required fields, text lengths, dates, statuses, and record IDs.
- Confirm a deletion before sending the request.
- Display loading, empty, success, validation, and API error messages.
- Retry a failed list request using the Try again button.
- Disable repeated save and delete actions while a request is in progress.
- Automatically dismiss success notifications after five seconds.
- Adapt to smaller screens with a scrollable table and a separate application form.

Summary cards always describe the complete loaded dataset. Searching and filtering change the table and its results count. Rejected applications count toward Total but do not have a separate summary card.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript modules |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL with the `pg` connection pool |
| Configuration | Environment variables loaded through `dotenv` |
| Cloud hosting | Render web service and Neon PostgreSQL |
| API checks | Postman and browser-based manual checks |
| Version control | Git and GitHub |

## How It Works

Express serves both the frontend files and the `/api` endpoints. The frontend makes relative requests to `/api/applications`, and the backend uses parameterized SQL queries to read and change records in PostgreSQL. A single running server is enough for local development; a separate frontend server is not required.

## Project Structure

| Path | Purpose |
| --- | --- |
| `frontend/index.html` | Page layout, summary cards, table, and dialogs |
| `frontend/css/styles.css` | Desktop and mobile styling |
| `frontend/js/app.js` | UI state, API requests, validation messages, search, and filtering |
| `backend/server.js` | Database startup checks and HTTP server |
| `backend/app.js` | Express configuration, static files, API routes, and error responses |
| `backend/config/db.js` | PostgreSQL connection pool |
| `backend/routes/applications.routes.js` | CRUD route definitions |
| `backend/controllers/applications.controller.js` | Validation, SQL queries, and API responses |
| `schema/database.sql` | Applications table and database constraints |
| `.env.example` | Local configuration template without real credentials |
| `package.json` | Dependencies and development/start commands |

## Run Locally

### Prerequisites

- Node.js 22 or later and npm.
- A running PostgreSQL server.
- pgAdmin or another PostgreSQL client for importing the schema.

### 1. Install dependencies

For a fresh checkout:

```powershell
git clone https://github.com/majdharb123/decodelabs_tasks.git
cd decodelabs_tasks/project-4-job-tracker
npm install
```

If the repository is already on your computer, open a terminal in `project-4-job-tracker` and run `npm install` there.

### 2. Create the database and table

In pgAdmin, connect to your local PostgreSQL server. Create a database named `job_tracker` through the Databases menu, or execute the following statement while connected to an existing database such as `postgres`:

```sql
CREATE DATABASE job_tracker;
```

Create it once. If `job_tracker` already exists, use the existing database.

Next, open the Query Tool connected specifically to `job_tracker`, open `schema/database.sql`, and execute its contents. The schema creates `public.applications` if it does not already exist and does not delete existing records.

### 3. Configure the environment

Run this PowerShell command from the project folder to create `.env` only if it does not already exist:

```powershell
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
}
```

Edit the root `.env` file with your own local PostgreSQL credentials:

```dotenv
PORT=3000
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=job_tracker
PGUSER=postgres
PGPASSWORD="YOUR_POSTGRES_PASSWORD"
```

Replace the example password with your PostgreSQL password. Keep `.env` private; it is excluded from Git. This version reads the PostgreSQL `PG*` variables shown above rather than a `DATABASE_URL` variable.

### 4. Start the application

```powershell
npm run dev
```

The server checks the database connection and applications table before it starts listening. Successful startup includes:

```text
PostgreSQL connected: job_tracker
Job Tracker API: http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Use the server URL rather than opening the HTML file directly or using a separate Live Server port.

Use `npm start` to run the same server without Node's file watcher. Both commands should be run from the project folder so the root `.env` file is loaded.

## REST API

| Method | Endpoint | Successful response |
| --- | --- | --- |
| GET | `/api/health` | `200` with the service status |
| GET | `/api/applications` | `200` with an array of applications |
| POST | `/api/applications` | `201` with the created application |
| PUT | `/api/applications/:id` | `200` with the updated application |
| DELETE | `/api/applications/:id` | `204` with no response body |

POST and PUT accept JSON with `Content-Type: application/json`. PUT requires all four editable fields:

```json
{
  "company": "DemoTech",
  "job_title": "Junior Full-Stack Developer",
  "applied_date": "2026-10-14",
  "status": "Applied"
}
```

- Company: 1-100 characters after trimming surrounding whitespace.
- Job title: 1-150 characters after trimming surrounding whitespace.
- Application date: a real date in `YYYY-MM-DD` format, with a year from 0001 to 9999.
- Status: exactly Applied, Interview, Offer, or Rejected.
- Record ID: a positive integer within the PostgreSQL BIGINT range.

Applications are ordered by application date descending, then ID descending. BIGINT IDs are returned as strings to avoid losing precision in JavaScript.

Invalid input returns `400`. Updating or deleting a missing application returns `404`. Unexpected server errors return `500` with a generic message. Malformed JSON returns `400`, and JSON bodies over the configured 16 KB limit return `413`.

`/api/health` reports that the HTTP service is responding; it is not a live database connectivity check.

## Manual Verification

The local version has been checked for:

- Empty-list loading and display.
- Creating, editing, and deleting applications through the UI and API.
- Persistence after a page refresh.
- Required-field and backend validation errors.
- Company search, case-insensitive matching, and combined search/status filtering.
- Correct results counts and summary totals for sample records.
- Responsive summary cards, controls, horizontal table scrolling, and form access.
- A blocked application-list request displaying an error and Try again button.
- Successful recovery after unblocking the request and selecting Try again.

The deployed version was also verified on October 16, 2026:

- The website, health endpoint, and application-list endpoint returned HTTP `200`.
- The deployed server connected to the Neon database.
- Browser checks covered creating an application and retaining it after refresh.
- Editing the application's status, saving, and refreshing retained the change.
- Combined company search and status filtering returned the matching record.
- Deleting an application and refreshing confirmed its removal.

## Cloud Deployment

The current deployment uses one Render web service and a Neon PostgreSQL database in Frankfurt. The frontend uses relative API URLs, so it is served from the same origin as the backend.

### 1. Prepare Neon

Create a Neon project and database. In the Neon SQL Editor, select that database and execute the contents of [schema/database.sql](schema/database.sql). Creating a cloud database does not copy records from your local PostgreSQL server.

Copy the host, database name, role, and password from Neon's connection details. The current setup uses a pooled host. This backend reads individual `PG*` variables; setting only `DATABASE_URL` does not configure its connection pool.

### 2. Configure the Render web service

Connect the repository and use the following settings:

| Setting | Value |
| --- | --- |
| Repository | `majdharb123/decodelabs_tasks` |
| Branch | `main` |
| Runtime | Node |
| Region | Frankfurt |
| Root Directory | `project-4-job-tracker` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free, for this demo |
| Auto-Deploy | On Commit |

Add these environment variables in Render, replacing the placeholder values with your own connection details:

| Variable | Value |
| --- | --- |
| `PGHOST` | Your Neon hostname, such as `your-endpoint-pooler.eu-central-1.aws.neon.tech` |
| `PGPORT` | `5432` |
| `PGDATABASE` | Your Neon database name, such as `neondb` |
| `PGUSER` | Your Neon database role, such as `neondb_owner` |
| `PGPASSWORD` | Your private Neon database password |
| `PGSSLMODE` | `verify-full` |
| `NODE_VERSION` | `22.x` |

Enter values directly into Render's fields without surrounding quotation marks. Keep the database password in the hosting environment rather than in source control. Render supplies `PORT` automatically, and the server listens on `0.0.0.0` using that port.

### 3. Deploy and verify

Deploy the latest commit. The server checks both the database connection and the applications table before accepting HTTP requests. Successful startup includes:

```text
PostgreSQL connected: neondb
Job Tracker API: http://localhost:10000
```

The database name and port in the log depend on your environment. Use the public HTTPS address assigned by Render to open the deployed website.

Verify the health endpoint and the applications endpoint, then create, edit, and delete a sample application through the website. Refresh after each change to confirm cloud persistence.

## Demo Scope

This is a shared internship demo without authentication or user-specific data separation. Anyone who can access its API can change the shared records. Use sample applications in a public deployment.

## Author

**Majd Harb**

- [GitHub](https://github.com/majdharb123)
- [DecodeLabs internship repository](https://github.com/majdharb123/decodelabs_tasks)
