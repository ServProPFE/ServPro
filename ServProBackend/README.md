# ServPro Backend

Backend API for ServPro - an on-demand services platform connecting clients with service providers (plumbing, electrical, cleaning, HVAC, etc.).

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Authentication & Authorization](#authentication--authorization)
- [Database Models](#database-models)
- [Development](#development)
- [Testing](#testing)
- [Scripts](#scripts)

## ✨ Features

- **User Management**: CLIENT, PROVIDER, and ADMIN roles with JWT authentication
- **Service Management**: Create, update, list, and delete services with pricing and categories
- **Booking System**: Complete reservation flow with status tracking
- **Transaction Management**: Automatic transaction creation & payment tracking with multiple methods (new)
- **Payment Integration**: Transaction management with multiple payment methods
- **Review System**: Ratings and comments for service providers
- **Provider Profiles**: Portfolio, certifications, competences, and availability management
- **Real-time Tracking**: Track service provider location and booking status
- **Offers & Packages**: Promotional offers and subscription packages
- **Invoice & Commission**: Automated financial document generation and commission calculation
- **Notifications**: Multi-channel notification system (Email, Push, In-App)
- **Internationalization**: Support for bilingual responses (AR/EN)
- **AI Chatbot Integration**: Node.js delegates intent analysis to Python microservice and returns actionable service guidance

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs
- **API Design**: RESTful architecture
- **Logging**: Morgan
- **Security**: CORS enabled, password hashing

## 📁 Project Structure

```
ServProBackend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── utils/           # Helper functions
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── .env.example         # Environment variables template
├── package.json         # Dependencies
└── README.md
```

## 🚀 Installation

### Prerequisites

- Node.js >= 20.x
- MongoDB >= 5.x (local or MongoDB Atlas)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ServProBackend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your settings (see [Configuration](#configuration)).

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the server**
   ```bash
   npm start        # Production
   npm run dev      # Development with nodemon
   ```

6. **(Optional but recommended) Start Python AI service for chatbot**
  ```bash
  # If you keep the AI repo checked out beside this one
  cd ../python_ai
  python -m pip install -r requirements.txt
  python app.py
  ```

   If the AI service is deployed on Render, set `PYTHON_AI_SERVICE` to the Render URL instead of running it locally.

7. **Run the backend unit tests**
  ```bash
  npm test
  ```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/servpro
NODE_ENV=development
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
PYTHON_AI_SERVICE=http://localhost:5000
GEMINI_API_KEY=your_api_key_optional
```

Production (Render) example:

```env
NODE_ENV=production
PYTHON_AI_SERVICE=https://chatbot-ai-smpu.onrender.com
PYTHON_AI_TIMEOUT_MS=20000
PYTHON_AI_RETRIES=3
PYTHON_AI_RETRY_BASE_DELAY_MS=2000
PYTHON_AI_HEALTH_TIMEOUT_MS=20000
PYTHON_AI_HEALTH_RETRIES=3
```

### Environment Variables

| Variable        | Description                          | Default                           |
|----------------|--------------------------------------|-----------------------------------|
| `PORT`         | Server port                          | `4000`                            |
| `MONGODB_URI`  | MongoDB connection string            | `mongodb://localhost:27017/servpro` |
| `NODE_ENV`     | Environment (development/production) | `development`                     |
| `JWT_SECRET`   | Secret key for JWT signing           | *Required*                        |
| `JWT_EXPIRES_IN` | Token expiration time              | `7d`                              |
| `PYTHON_AI_SERVICE` | Python chatbot service base URL or Render URL | `http://localhost:5000`          |
| `GEMINI_API_KEY` | Optional fallback model API key for the AI service | *Optional* |
| `PYTHON_AI_TIMEOUT_MS` | Timeout for AI requests (ms) | `12000` |
| `PYTHON_AI_RETRIES` | Retry attempts for AI requests | `2` |
| `PYTHON_AI_RETRY_BASE_DELAY_MS` | Exponential backoff base delay (ms) | `1500` |
| `PYTHON_AI_HEALTH_TIMEOUT_MS` | Timeout for `/chatbot/health` probe (ms) | `5000` |
| `PYTHON_AI_HEALTH_RETRIES` | Retry attempts for health probe | `1` |

### AI health diagnostics

- `GET /chatbot/health` verifies Node backend and Python AI availability.
- Status `online`: Python AI is reachable.
- Status `degraded`: backend is up but Python AI is unavailable (chatbot falls back to static guidance message).

Example:

```http
GET /chatbot/health
```

## 📚 API Documentation

### Base URL
```
http://localhost:4000
```

### Authentication Endpoints

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "type": "CLIENT | PROVIDER | ADMIN",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+21612345678",
  "password": "securePassword123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "type": "CLIENT",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### List Providers (Public)
```http
GET /auth/providers
```

Returns all users with role `PROVIDER` for frontend directory/portfolio browsing.

**Response:**
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Provider Name",
      "email": "provider@example.com",
      "phone": "+21612345678",
      "providerProfile": {
        "companyName": "Company",
        "verificationStatus": "VERIFIED"
      }
    }
  ]
}
```

### Protected Endpoints

All protected endpoints require an `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

### Services

| Method | Endpoint          | Auth Required | Roles                  | Description          |
|--------|-------------------|---------------|------------------------|----------------------|
| GET    | `/services`       | No            | Public                 | List all services    |
| POST   | `/services`       | Yes           | PROVIDER, ADMIN        | Create service       |
| PUT    | `/services/:id`   | Yes           | PROVIDER, ADMIN        | Update service       |
| DELETE | `/services/:id`   | Yes           | PROVIDER, ADMIN        | Delete service       |

Notes:
- `GET /services` supports optional query filters: `category` and `providerId`.

### Bookings

| Method | Endpoint              | Auth Required | Roles                  | Description             |
|--------|-----------------------|---------------|------------------------|-------------------------|
| GET    | `/bookings`           | Yes           | CLIENT, PROVIDER, ADMIN| List bookings           |
| POST   | `/bookings`           | Yes           | CLIENT                 | Create booking          |
| PATCH  | `/bookings/:id/status`| Yes           | PROVIDER, ADMIN        | Update booking status   |
| DELETE | `/bookings/:id`       | Yes           | CLIENT, ADMIN          | Delete booking          |

### Transactions (New)

| Method | Endpoint              | Auth Required | Roles                     | Description                    |
|--------|------------------------|---------------|---------------------------|--------------------------------|
| GET    | `/transactions`        | Yes           | CLIENT, ADMIN             | List all transactions          |
| POST   | `/transactions`        | Yes           | CLIENT                    | Create transaction             |
| PUT    | `/transactions/:id`    | Yes           | ADMIN                     | Update transaction status      |
| DELETE | `/transactions/:id`    | Yes           | ADMIN                     | Delete transaction             |

**Note**: Transactions are auto-created when booking status changes to CONFIRMED.

**Example Transaction Creation** (automatic on booking confirmation):
```json
{
  "booking": "booking_id",
  "amount": 150,
  "currency": "TND",
  "method": "CASH",
  "status": "PENDING"
}
```

**Payment Methods**:
- CARD
- KNET
- APPLE_PAY
- GOOGLE_PAY
- PAYPAL
- CASH

### Reviews

| Method | Endpoint                   | Auth Required | Roles          | Description                 |
|--------|----------------------------|---------------|----------------|-----------------------------|
| GET    | `/reviews`                 | No            | Public         | List all reviews            |
| GET    | `/reviews/provider/:id`    | No            | Public         | Provider reviews            |
| GET    | `/reviews/client/:id`      | Yes           | CLIENT, ADMIN  | Client reviews              |
| POST   | `/reviews`                 | Yes           | CLIENT         | Create review               |
| PUT    | `/reviews/:id`             | Yes           | CLIENT, ADMIN  | Update review               |
| DELETE | `/reviews/:id`             | Yes           | CLIENT, ADMIN  | Delete review               |

### Offers

| Method | Endpoint        | Auth Required | Roles           | Description      |
|--------|-----------------|---------------|-----------------|------------------|
| GET    | `/offers`       | No            | Public          | List offers      |
| POST   | `/offers`       | Yes           | PROVIDER, ADMIN | Create offer     |
| PUT    | `/offers/:id`   | Yes           | PROVIDER, ADMIN | Update offer     |
| DELETE | `/offers/:id`   | Yes           | PROVIDER, ADMIN | Delete offer     |

### Packages (Admin Only)

| Method | Endpoint         | Auth Required | Roles | Description       |
|--------|------------------|---------------|-------|-------------------|
| GET    | `/packages`      | No            | Public| List packages     |
| POST   | `/packages`      | Yes           | ADMIN | Create package    |
| PUT    | `/packages/:id`  | Yes           | ADMIN | Update package    |
| DELETE | `/packages/:id`  | Yes           | ADMIN | Delete package    |

## 🧪 Testing

The backend uses Jest for unit testing. The current suite focuses on fast, reliable checks around middleware, route wiring, server startup, and selected controllers so the team can validate core behavior with confidence before moving to manual or integration testing.

### What is covered today

- Express app bootstrap and route registration
- Server startup behavior and configuration validation
- Error handling and async wrapper utilities
- Health endpoint behavior
- Authentication controller happy paths and failure paths
- Service controller list, fetch, create, update, and delete flows

### Run the tests

```bash
npm test
```

### Test philosophy

- Keep tests focused on one unit at a time
- Mock database and external service calls so results stay stable
- Cover both the expected flow and the recovery path
- Prefer readable assertions that explain business intent, not only implementation detail

### Recommended next steps

- Add controller tests for bookings, reviews, and transactions
- Introduce API-level integration tests for critical routes
- Add coverage reporting once the team agrees on a target threshold

### Additional Resources

- **Portfolios**: `/portfolios` - Provider work showcase
- **Competences**: `/competences` - Provider skills & expertise
- **Certifications**: `/certifications` - Provider certifications
- **Availability**: `/availability` - Provider schedule
- **Tracking**: `/tracking` - Real-time booking tracking
- **Chatbot**: `/chatbot` - AI-powered assistant (Node.js + Python AI service)
- **Invoices**: `/invoices` - Transaction invoices (ADMIN only)
- **Commissions**: `/commissions` - Platform commissions (ADMIN only)
- **Notations**: `/notations` - Provider ratings (ADMIN only)
- **Reservation Details**: `/reservation-details` - Booking details

Provider-oriented list endpoints support optional filter `providerId`:
- `GET /portfolios?providerId=<providerId>`
- `GET /certifications?providerId=<providerId>`
- `GET /availability?providerId=<providerId>`

### Chatbot Endpoints

| Method | Endpoint                | Auth Required | Roles         | Description |
|--------|-------------------------|---------------|---------------|-------------|
| POST   | `/chatbot`              | Yes           | CLIENT, ADMIN | Get AI chatbot response + recommended service |
| POST   | `/chatbot/analyze`      | Yes           | CLIENT, ADMIN | Detailed intent score analysis |
| GET    | `/chatbot/suggestions`  | No            | Public        | Localized suggestion prompts |
| GET    | `/chatbot/health`       | No            | Public        | Node↔Python AI service health status |

## 🔐 Authentication & Authorization

### JWT Token

All protected routes require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Role-Based Access Control (RBAC)

The system implements three user types with specific permissions:

#### CLIENT
- Create bookings and reservation details
- Submit reviews
- View services, offers, and provider information
- Manage own profile

#### PROVIDER
- Manage services and offers
- Update booking status
- Create tracking updates
- Manage portfolio, certifications, competences, and availability
- View bookings assigned to them

#### ADMIN
- Full system access
- Manage invoices, commissions, packages, and notations
- Delete/modify any resource
- View all system data

## 🗄️ Database Models

### Core Entities

1. **User** - User accounts with role-based profiles
2. **Service** - Service offerings with pricing
3. **Booking** - Reservation records with status tracking
4. **Transaction** - Payment processing records (auto-created on booking confirmation) (new)
5. **Review** - Customer feedback and ratings
6. **Notification** - System notifications

### Provider Profile Entities

7. **Portfolio** - Provider work samples
8. **Competence** - Service expertise levels
9. **Certification** - Professional certifications
10. **Availability** - Provider schedule
11. **Notation** - Aggregate ratings

### Business Entities

12. **Offer** - Promotional offers
13. **Package** - Subscription plans
14. **Invoice** - Payment invoices
15. **Commission** - Platform fees
16. **ReservationDetail** - Booking details
17. **Tracking** - Service tracking logs

## 💻 Development

### Transaction Workflow

Transactions are managed with the following automatic flow:

1. **Booking Created**: When a booking is created with `status: CONFIRMED`, a transaction is automatically generated
2. **Booking Status Updated**: When an existing booking status is updated to `CONFIRMED`, a transaction is created (if not already existing)
3. **Transaction States**:
   - `PENDING` - Initial state, awaiting payment processing
   - `SUCCESS` - Payment processed successfully
   - `FAILED` - Payment processing failed
4. **Admin Management**: Admins can view, filter, and update transaction statuses via the Dashboard

### Payment Methods Supported

Transactions support multiple payment methods:
- **CARD** - Debit/Credit card
- **KNET** - Kuwait's electronic payment gateway
- **APPLE_PAY** - Apple's payment system
- **GOOGLE_PAY** - Google's payment system  
- **PAYPAL** - PayPal payment
- **CASH** - Cash payment (default)

```bash
npm run dev
```

This starts the server with nodemon for auto-reload on file changes.

### API Testing

Use tools like:
- **Postman** - Import the collection (coming soon)
- **Thunder Client** (VS Code extension)
- **curl** or **httpie**

### Example Request with curl

```bash
# Register a new user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CLIENT",
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# List services (public)
curl http://localhost:4000/services

# List transactions (Admin only)
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:4000/transactions

# Update transaction status (Admin only)
curl -X PUT http://localhost:4000/transactions/TRANSACTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "status": "SUCCESS"
  }'

# Create booking (protected - requires token)
curl -X POST http://localhost:4000/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "client": "userId",
    "provider": "providerId",
    "service": "serviceId",
    "expectedAt": "2026-03-15T10:00:00Z",
    "totalPrice": 150,
    "currency": "TND",
    "detail": "detailId"
  }'
```

## 📜 Scripts

| Command              | Description                                   |
|----------------------|-----------------------------------------------|
| `npm start`          | Start production server                       |
| `npm run dev`        | Start development server with nodemon         |
| `npm run seed`       | Reset and seed local database with test data  |
| `npm test`           | Run Jest tests in-band                        |
| `npm run test:coverage` | Run Jest with coverage report             |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

ISC

## 👥 Contact

For questions or support, please contact the development team.

---

**Note**: This is an academic project developed as part of an end-of-studies project.
