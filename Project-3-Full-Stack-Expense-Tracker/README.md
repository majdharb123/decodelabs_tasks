# ExpenseFlow — Full-Stack Expense Tracker

ExpenseFlow is a responsive full-stack web application for tracking monthly income and expenses. It provides a clear financial dashboard, transaction management, category organization, monthly filtering, and real-time financial summaries.

This project was developed as **Project 3** during the **DecodeLabs Full-Stack Development Internship**.

## Live Application

- **Live Website:** https://expenseflow-app-c2an.onrender.com
- **Live API:** https://expenseflow-api-d8tq.onrender.com
- **GitHub Repository:** https://github.com/majdharb123/decodelabs_tasks

> The backend is hosted on Render's free service, so the first request may take a few seconds while the service wakes up.

## Main Features

### Dashboard

- View total balance, income, and expenses.
- Display monthly financial activity.
- View spending distribution by category.
- Review recent transactions.
- Select different months and years.
- Automatically update all statistics after transaction changes.

### Transaction Management

- Create income and expense transactions.
- View all transactions.
- Edit existing transactions.
- Delete transactions.
- Search transactions by title or notes.
- Filter transactions by type and category.
- Preserve the selected page after refreshing the browser.

### Category Management

- View income and expense categories.
- Create custom categories.
- Edit category information.
- Delete unused categories.
- Prevent deletion of categories linked to existing transactions.
- Assign a custom name, color, icon, and transaction type.

### Responsive Design

- Responsive desktop, tablet, and mobile layouts.
- Mobile navigation sidebar.
- Scrollable and accessible forms.
- Responsive transaction and category cards.
- Touch-friendly controls and modals.

## Technologies Used

### Frontend

- HTML5
- CSS3
- JavaScript
- Lucide Icons
- Fetch API
- Local Storage

### Backend

- Node.js
- Express.js
- PostgreSQL
- `pg`
- CORS
- dotenv
- Nodemon

### Deployment

- Render Static Site — Frontend
- Render Web Service — Backend API
- Neon — PostgreSQL database
- GitHub — Source code and version control

## Project Structure

```text
Project-3-Full-Stack-Expense-Tracker/
├── client/
│   ├── favicon.svg
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── server/
│   ├── database/
│   │   └── schema.sql
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   │   ├── category.controller.js
│   │   │   └── transaction.controller.js
│   │   ├── routes/
│   │   │   ├── category.routes.js
│   │   │   └── transaction.routes.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   ├── .gitignore
│   ├── package-lock.json
│   └── package.json
│
└── README.md
```

## REST API Endpoints

### Categories

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/categories` | Get all categories |
| `POST` | `/api/categories` | Create a category |
| `PUT` | `/api/categories/:id` | Update a category |
| `DELETE` | `/api/categories/:id` | Delete a category |

### Transactions

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/transactions` | Get all transactions |
| `GET` | `/api/transactions/:id` | Get one transaction |
| `POST` | `/api/transactions` | Create a transaction |
| `PUT` | `/api/transactions/:id` | Update a transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |

### Available Transaction Filters

The transactions endpoint supports optional query parameters:

```text
/api/transactions?month=2026-10
/api/transactions?type=expense
/api/transactions?categoryId=3
/api/transactions?search=groceries
```

Filters can also be combined in the same request.

## Database Design

ExpenseFlow uses two primary PostgreSQL tables:

### `categories`

Stores the category name, type, color, and icon.

### `transactions`

Stores the transaction title, amount, type, category, date, and notes.

Each transaction belongs to one category through a foreign-key relationship. A category cannot be deleted while it is being used by a transaction.

## Running the Project Locally

### 1. Clone the repository

```bash
git clone https://github.com/majdharb123/decodelabs_tasks.git
cd decodelabs_tasks/Project-3-Full-Stack-Expense-Tracker
```

### 2. Configure the database

Create a PostgreSQL database and execute:

```text
server/database/schema.sql
```

This creates the required tables and default categories.

### 3. Configure environment variables

Inside the `server` directory, create a `.env` file based on `.env.example`.

You can connect using a complete PostgreSQL URL:

```env
DATABASE_URL=your_postgresql_connection_string
PORT=5000
```

Alternatively, use individual local database values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expenseflow
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5000
```

Never commit the real `.env` file or database credentials.

### 4. Install and start the backend

```bash
cd server
npm install
npm run dev
```

The API will run at:

```text
http://localhost:5000
```

### 5. Start the frontend

Open the `client` directory using a local development server, such as the VS Code Live Server extension.

## Production Architecture

```text
Browser
   |
   v
Render Static Site
ExpenseFlow Frontend
   |
   v
Render Web Service
Express REST API
   |
   v
Neon PostgreSQL
```

## API Validation and Error Handling

The backend validates:

- Required transaction and category fields.
- Positive transaction amounts.
- Valid `income` and `expense` types.
- Valid category IDs.
- Matching category and transaction types.
- Dates using the `YYYY-MM-DD` format.
- Duplicate category names and types.
- Category deletion when linked transactions exist.

API responses use consistent success and error JSON formats.

## Testing

The complete REST API was tested using Postman, including:

- Creating transactions and categories.
- Reading individual and complete records.
- Filtering and searching transactions.
- Updating existing records.
- Deleting records.
- Validation and database constraint errors.

The deployed application was also tested for complete CRUD functionality and data persistence after page refresh.

## Future Improvements

- User registration and authentication.
- Separate financial data for each user.
- Budget limits and spending alerts.
- Recurring transactions.
- CSV and PDF report export.
- Additional charts and analytics.
- SaaS subscription plans.
- Automated tests.

## Author

**Majd Harb**

Junior Software Engineer | Full-Stack & Mobile Developer

- GitHub: https://github.com/majdharb123
- Portfolio: https://github.com/majdharb123/Portfolio

## Internship

Developed as part of the **DecodeLabs Full-Stack Development Internship**.