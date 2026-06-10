# Medicare Pharmacy Management System

A full-stack pharmacy management software for tracking medicines, stock levels, expiry dates, sales, prescriptions, and generating reports.

## Features
- 💊 Medicine catalogue with categories and dosage info
- 📦 Real-time inventory & stock level tracking
- ⚠️ Expiry date alerts (30 / 60 day warnings)
- 🛒 Point-of-sale (POS) & billing system
- 📋 Prescription management
- 👥 Supplier management & purchase orders
- 📊 Sales & stock reports with export
- 🔐 Role-based access (Admin, Pharmacist)
- 🔔 Low-stock & expiry notifications

## Tech Stack
| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 18, TypeScript, Vite    |
| UI         | Tailwind CSS, shadcn/ui       |
| State      | Zustand + React Query         |
| Backend    | Node.js, Express, TypeScript  |
| Database   | PostgreSQL + Prisma ORM       |
| Auth       | JWT + bcrypt                  |
| Testing    | Vitest (FE), Jest (BE)        |

## Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL >= 14
- npm or pnpm

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/medicare-pharmacy.git
cd medicare-pharmacy

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### Environment Setup

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials

# Frontend
cp frontend/.env.example frontend/.env
```

### Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### Running the App

```bash
# Backend (port 5000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

## Project Structure

```
medicare-pharmacy/
├── backend/          # Node.js + Express API
│   └── src/
│       ├── config/       # DB, env config
│       ├── controllers/  # Route handlers
│       ├── middleware/   # Auth, validation, error handling
│       ├── models/       # Prisma models
│       ├── routes/       # API routes
│       ├── services/     # Business logic
│       └── utils/        # Helpers, logger
├── frontend/         # React + Vite app
│   └── src/
│       ├── components/   # Reusable UI components
│       ├── pages/        # Page-level components
│       ├── hooks/        # Custom React hooks
│       ├── store/        # Zustand state stores
│       ├── services/     # API client calls
│       └── types/        # TypeScript interfaces
└── docs/             # ERD, API docs, screenshots
```

## API Endpoints

| Resource     | Endpoint              |
|--------------|-----------------------|
| Auth         | `/api/auth`           |
| Medicines    | `/api/medicines`      |
| Inventory    | `/api/inventory`      |
| Sales        | `/api/sales`          |
| Suppliers    | `/api/suppliers`      |
| Prescriptions| `/api/prescriptions`  |
| Reports      | `/api/reports`        |
| Users        | `/api/users`          |

## License
MIT
