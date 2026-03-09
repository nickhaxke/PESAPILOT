# PesaPilot - Personal Finance Manager

A modern, clean personal finance web application that helps users manage their income, expenses, and budgets with smart financial insights.

![PesaPilot Dashboard](https://via.placeholder.com/800x400?text=PesaPilot+Dashboard)

## Features

- **User Authentication** - Secure registration, login, and logout
- **Dashboard** - Financial overview with charts and insights
- **Income Tracking** - Record and manage income from various sources
- **Expense Tracking** - Track spending across categories
- **Budget Management** - Set and monitor monthly budgets
- **Financial Insights** - Automatic insights about spending patterns
- **Transaction History** - View, filter, and export all transactions

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Charts**: Recharts
- **Authentication**: JWT

## Prerequisites

- Node.js 18+ installed
- MySQL server running (via WAMP, XAMPP, or standalone)
- npm or yarn package manager

## Setup Instructions

### 1. Database Setup

1. Open phpMyAdmin or MySQL command line
2. Run the SQL script to create the database and tables:

```bash
cd backend
# Copy the contents of database/schema.sql and run in MySQL
```

Or run directly in MySQL:

```sql
source c:/wamp64/www/PesaPilot/backend/database/schema.sql
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment (edit .env file if needed)
# Default settings work with WAMP's MySQL

# Start the server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## Environment Variables

### Backend (.env)

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=pesapilot
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password

### Income
- `GET /api/income` - Get all income
- `POST /api/income` - Add income
- `PUT /api/income/:id` - Update income
- `DELETE /api/income/:id` - Delete income

### Expenses
- `GET /api/expenses` - Get all expenses
- `POST /api/expenses` - Add expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Budgets
- `GET /api/budgets` - Get budgets for a month
- `POST /api/budgets` - Create/update budget
- `DELETE /api/budgets/:id` - Delete budget
- `POST /api/budgets/copy` - Copy budgets from previous month

### Dashboard
- `GET /api/dashboard/overview` - Financial overview
- `GET /api/dashboard/spending-by-category` - Spending breakdown
- `GET /api/dashboard/monthly-trend` - Monthly trend data
- `GET /api/dashboard/insights` - Financial insights
- `GET /api/dashboard/recent` - Recent transactions

### Transactions
- `GET /api/transactions` - Get all transactions with filters
- `GET /api/transactions/summary` - Transaction summary
- `GET /api/transactions/export` - Export as CSV

## Project Structure

```
PesaPilot/
├── backend/
│   ├── config/
│   │   └── database.js        # MySQL connection
│   ├── database/
│   │   └── schema.sql         # Database schema
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Auth routes
│   │   ├── income.js          # Income routes
│   │   ├── expense.js          # Expense routes
│   │   ├── budget.js          # Budget routes
│   │   ├── dashboard.js       # Dashboard routes
│   │   └── transactions.js    # Transaction routes
│   ├── .env                   # Environment config
│   ├── package.json
│   └── server.js              # Express server
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   └── Layout.jsx     # Main layout with sidebar
    │   ├── context/
    │   │   └── AuthContext.jsx # Auth state management
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Income.jsx
    │   │   ├── Expenses.jsx
    │   │   ├── Budgets.jsx
    │   │   ├── Transactions.jsx
    │   │   └── Settings.jsx
    │   ├── services/
    │   │   └── api.js         # Axios API client
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## Expense Categories

- Food
- Transport
- Rent
- Bills
- Entertainment
- Shopping
- Health
- Education
- Other

## Income Sources

- Salary
- Business
- Freelance
- Investments
- Rental
- Gift
- Other

## Screenshots

### Login Page
Modern, clean login interface with email and password authentication.

### Dashboard
Overview of finances with:
- Total income, expenses, and balance cards
- Spending by category pie chart
- Monthly trend bar chart
- Financial insights
- Recent transactions

### Income/Expense Pages
Easy-to-use forms for adding and managing transactions.

### Budget Management
Visual budget tracking with progress bars and status indicators.

### Transactions
Comprehensive transaction history with filtering and export capabilities.

## License

MIT License

## Author

Built with ❤️ for managing personal finances
