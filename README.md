# Timesheet System

This repository contains both the frontend and backend applications for the Timesheet System.

## Repository Structure

```
├── backend/            # Django REST API Backend
└── frontend/           # React + Vite + TypeScript Frontend
```

---

## Backend Setup

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows (CMD)**: `.\venv\Scripts\activate.bat`
- **Windows (PowerShell)**: `.\venv\Scripts\Activate.ps1`
- **macOS/Linux**: `source venv/bin/activate`

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the `backend/` directory and copy the contents from `.env.example`:
```bash
cp .env.example .env
```
Fill in your local database settings and SMTP credentials.

### 5. Run Database Migrations
```bash
python manage.py migrate
```

### 6. Seed the Database (Optional)
```bash
python seed_db.py
```
*Note: This creates an admin user `admin` with password `admin123`.*

### 7. Run the Server
```bash
python manage.py runserver
```
The server will start at `http://127.0.0.1:8000/`.

---

## Frontend Setup

### 1. Navigate to the frontend directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
The frontend application will start (usually at `http://localhost:5173/`).
