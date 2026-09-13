# PillSync

PillSync is an intelligent medicine reminder and medication tracking platform designed to help users manage prescriptions, adhere to dosage schedules, and track medication intake effortlessly.

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Axios, Lucide Icons
- **Backend**: Python, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2
- **Database**: PostgreSQL with Psycopg3 & Alembic Migrations
- **Authentication**: JWT Bearer Tokens with Bcrypt Hashing & Role-Based Access (Patient, Caregiver, Admin)

## Project Structure

```text
PillSync/
├── frontend/          # React + Vite + Tailwind CSS frontend application
├── backend/           # FastAPI Python backend service
│   ├── app/           # API routes, models, schemas, and services
│   ├── alembic/       # Database migrations
│   └── seed_demo_data.py # Realistic demo data seeder
├── database/          # Database migrations, schemas, and models
├── docs/              # Project documentation and specifications
├── .env               # Active environment configuration
├── .env.example       # Example environment variables template
├── .gitignore         # Root git ignore rules
└── README.md          # Project overview and getting started instructions
```

## Getting Started

### Prerequisites

- Node.js (v18+) and npm
- Python (v3.10+)
- PostgreSQL (running locally on port 5432)

---

### Backend Setup & Startup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   - **Windows**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. *(Optional / Recommended)* Seed rich demo data:
   ```bash
   python seed_demo_data.py
   ```

5. Start the FastAPI backend server:
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

   The backend API will be running at `http://127.0.0.1:8000`.  
   Health check endpoint: `http://127.0.0.1:8000/api/health`

---

### Frontend Setup & Startup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

   The frontend application will be running at `http://localhost:5173`.

---

## Demo Accounts for Presentation

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Patient** | `patient@pillsync.com` | `Patient@123456` | Sarah Jenkins (Type 2 Diabetes & Asthma, with 7 active medications and dose history) |
| **Caregiver** | `caregiver@pillsync.com` | `Caregiver@123456` | Dr. Michael Vance (Assigned to Sarah Jenkins) |
| **Admin** | `admin@pillsync.com` | `Admin@123456` | System Administrator (Full system management & analytics) |

> **Tip**: The login page (`/login`) includes **1-Click Demo Login buttons** to easily test and demonstrate all 3 user roles during live presentations without typing credentials!
