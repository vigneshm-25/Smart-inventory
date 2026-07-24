# Smart Inventory AI

> 🚀 Modern, ID-based inventory management platform for college clubs and organizations

A production-quality web application that enables members to borrow and return shared equipment using human-readable Item IDs, while administrators manage everything through a clean real-time dashboard.

## ✨ Features

- **ID-Based Borrowing & Lookup** — Search equipment catalog or enter human-readable Item IDs (`ITM-001`) directly to borrow/return
- **Real-Time Dashboard** — Live updates via Socket.io when items are borrowed or returned
- **Analytics & Reports** — Interactive charts showing borrow trends, category distribution, and club usage
- **Role-Based Access** — Admin dashboard + Member portal with strict role isolation
- **Dark Mode** — Clean light/dark theme with system preference detection
- **Responsive Design** — Desktop-first admin, mobile-first member portal
- **JWT Authentication** — Secure registration, login, and protected routes

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| UI | Framer Motion, Recharts, Lucide Icons |
| Backend | Node.js, Express.js, TypeScript |
| Real-time | Socket.io |
| Database | SQLite (sql.js) |
| Auth | JWT, bcryptjs |

## 📦 Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Setup Database

```bash
cd server

# Run migrations and seed with sample data
npm run seed
```

### 3. Start Development

```bash
# Terminal 1 — Start backend (localhost:3001)
cd server
npm run dev

# Terminal 2 — Start frontend (localhost:5173)
cd client
npm run dev
```

### 4. Open the App

Visit **http://localhost:5173**

### Demo Credentials

| Role | Email | Password | Target Interface |
|------|-------|----------|------------------|
| Admin | admin@inventory.ai | admin123 | Desktop Dashboard (`/admin`) |
| Member 1 | member1@inventory.ai | member123 | Member Portal (`/member`) |
| Member 2 | member2@inventory.ai | member123 | Member Portal (`/member`) |

---

## 📁 Project Structure

```
smart_inventory/
├── server/                    # Express.js Backend
│   ├── src/
│   │   ├── config/            # Database, env config
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, error handling
│   │   ├── routes/            # API routes
│   │   ├── websocket/         # Socket.io handlers
│   │   └── index.ts           # Entry point
│   ├── migrations/            # SQL schema
│   └── seeds/                 # Sample data
│
├── client/                    # React + Vite Frontend
│   ├── src/
│   │   ├── contexts/          # Auth, Theme, Socket
│   │   ├── layouts/           # Admin, Member layouts
│   │   ├── pages/             # Route pages
│   │   ├── lib/               # API client, utils
│   │   └── types/             # TypeScript definitions
│   └── index.html
│
└── README.md
```

---

Built with ❤️ for hackathon excellence
