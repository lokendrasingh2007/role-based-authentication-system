# Role-Based Authentication & JWT Microservice

A secure, full-stack authentication system with role-based access control (RBAC), JWT authentication, and user management. Built as part of a Full Stack Development internship assignment.

## Overview

This project provides a web-based authentication system where users can register, log in, manage their profiles, and access protected resources based on their roles.

Administrators can manage user accounts, update roles, activate or deactivate accounts, and review administrative activity logs.

## Features

### Authentication
- User registration and login
- Secure password hashing using bcrypt
- JWT-based authentication
- HttpOnly cookie-based token storage
- User profile management
- Change password functionality
- Protected routes and API endpoints
- Input validation using Zod

### Role-Based Access Control
- **ADMIN:** Manage users, update roles, manage account status, and access audit logs.
- **USER:** Access authorized user features and manage their own profile.

Authorization is enforced on the backend to prevent unauthorized access to administrative operations.

### Admin Dashboard
- View and search registered users
- Paginated user listing
- Change user roles
- Activate or deactivate user accounts
- Review administrative audit logs

### Security
- Password hashes are excluded from API responses.
- Environment variables are used for secrets and database configuration.
- Authentication endpoints use rate limiting.
- CORS is configured for the frontend origin.
- Request validation and centralized error handling are implemented.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Frontend application |
| TypeScript | Type safety |
| Tailwind CSS | Responsive styling |
| Node.js | JavaScript runtime |
| Express.js | REST API backend |
| MongoDB | Database |
| Prisma ORM | Database access and schema management |
| JWT | Authentication |
| bcrypt | Password hashing |
| Zod | Input and environment validation |
| Vitest | Automated testing |
| Supertest | HTTP API testing |

## Project Structure

```text
role-based-auth-system/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   └── admin/
│   │   ├── types/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── seed.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── .env.local.example
├── docs/
│   ├── api.md
│   └── postman_collection.json
├── .gitignore
└── README.md
```

*This structure describes the planned project organization. Adjust it if your actual repository differs.*

## Prerequisites

Install the following before running the project:

- Node.js version compatible with the installed Next.js and backend dependencies
- npm
- MongoDB, either a local instance or MongoDB Atlas
- Git

## Installation and Setup

### 1. Clone the repository

Replace the placeholders with your actual GitHub repository URL.

```bash
git clone <YOUR_REPOSITORY_URL>
cd role-based-auth-system
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and configure the required environment variables.

Example:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mongodb+srv://<username>:<password>@<cluster>/<database>"
JWT_SECRET="<generate-a-long-random-secret>"
FRONTEND_URL="http://localhost:3000"
COOKIE_SECURE=false
```

Use the exact variable names required by your existing application. The example values above are placeholders, not working credentials.

### 3. Configure Prisma and MongoDB

Verify that the installed Prisma version supports the MongoDB connector. This project uses Prisma v6 according to its compatibility decisions.

Generate the Prisma Client:

```bash
npx prisma generate
```

Synchronize the Prisma schema with the development database:

```bash
npx prisma db push
```

For MongoDB, use the documented schema synchronization workflow rather than assuming SQL migration commands are supported.

**Important:** Configure the MongoDB connection string securely. Never commit real database credentials.

### 4. Start the backend

Use the development command defined in `backend/package.json`, for example:

```bash
npm run dev
```

Confirm that the backend starts successfully and connects to MongoDB.

### 5. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
```

Copy `.env.local.example` to `.env.local` and configure the API base URL expected by your frontend.

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Use the exact environment variable name referenced by your source code.

### 6. Start the frontend

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The backend should also be running for authentication and user-management features to work.

## API Documentation

The following endpoints are intended for the application. Confirm their implementation and exact request/response formats in the source code or `docs/api.md`.

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |
| PATCH | `/api/auth/change-password` | Authenticated |
| GET | `/api/admin/users` | Admin |
| GET | `/api/admin/users/:id` | Admin |
| PATCH | `/api/admin/users/:id/role` | Admin |
| PATCH | `/api/admin/users/:id/status` | Admin |
| GET | `/api/admin/audit-logs` | Admin |

### Authentication Flow

1. A user submits registration details.
2. The backend validates the request and securely hashes the password.
3. The user logs in with valid credentials.
4. The backend issues a JWT using the configured cookie strategy.
5. Protected endpoints verify the token before returning authorized data.
6. Admin endpoints additionally verify the user's role.

Logout should clear the authentication cookie using compatible cookie settings.

## Running Tests

Run the commands supported by the scripts in your `package.json`.

For example, from the backend directory:

```bash
npm test
```

Run the frontend production build:

```bash
cd ../frontend
npm run build
```

If the frontend has a separate test script, run that as well.

### Recommended Test Cases

- Successful registration and login
- Duplicate email registration
- Invalid login credentials
- Password hashing and password changes
- Missing, invalid, and expired JWTs
- Access to protected endpoints
- USER access attempts against ADMIN endpoints
- Unauthorized role changes
- Disabled account login
- Admin user-management operations
- Audit-log creation
- Validation and error handling

Only report tests as passing after executing them.

## Security Notes

- Never commit `.env`, `.env.local`, passwords, JWT secrets, or database credentials.
- Keep the `.env.example` files limited to variable names and safe placeholders.
- Enforce role checks on the backend, not only in the frontend.
- Do not expose password hashes in API responses.
- Use HTTPS and secure cookie settings in production.
- Review CORS, cookie, and CSRF settings before deployment.
- Use an isolated test database for automated tests.
- Do not run destructive tests against production data.

## Future Improvements

- Email verification
- Password reset via email
- Refresh-token rotation
- Login activity monitoring
- More detailed audit-log filtering
- Deployment with production monitoring

## Internship Assignment

**Project:** Role-Based User Authentication & JWT Microservice  
**Track:** Full Stack Development  
**Purpose:** Demonstrate authentication, authorization, database integration, API development, security practices, and automated testing.

## Author

**Lokendra Singh Tanwar**

MERN Stack / Full Stack Developer

GitHub: <YOUR_GITHUB_PROFILE_URL>

LinkedIn: <YOUR_LINKEDIN_PROFILE_URL>

---

*This README should be updated to match the actual implementation, verified commands, and tested features before submission.*