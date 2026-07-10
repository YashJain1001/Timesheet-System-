# Timesheet System Backend

This repository contains the Django backend for the Timesheet System. It provides REST APIs for tracking employee hours, projects, clients, and automated email reminders for submitting timesheets.

## Features

- **Employee & Client Management**: Keep track of employees, clients, and projects.
- **Timesheet Submissions**: API endpoints to record daily timesheet logs.
- **Automated Reminders**: Custom Django management command and shell scripts to automate email reminders to employees who have not completed their daily hours.
- **Role-based Controls**: Admin, Team Lead, and Employee roles.

## Tech Stack

- **Framework**: Django & Django REST Framework (DRF)
- **Database**: PostgreSQL (Development supports SQLite if configured, defaults to PostgreSQL via env variables)
- **Authentication**: JWT (JSON Web Tokens)
- **SMTP Integration**: Email configuration for notifications and reminders

---

## Setup & Installation

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd timesheet_backend
```

### 2. Create a Virtual Environment
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows (CMD)**:
  ```cmd
  .\venv\Scripts\activate.bat
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **macOS/Linux**:
  ```bash
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory and copy the contents from `.env.example`:
```bash
cp .env.example .env
```
Fill in your local database settings and SMTP credentials in the `.env` file.

### 5. Run Database Migrations
Make sure your PostgreSQL database is running, then run:
```bash
python manage.py migrate
```

### 6. Seed the Database
To populate the database with default clients, projects, leads, and a superuser:
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

## Automated Reminders

To send email reminders to employees who haven't logged at least 8 hours for the day, you can run the following custom management command:

```bash
python manage.py send_timesheet_reminders
```

For Windows deployments, a batch script `run_reminders.bat` is provided. You can run it manually or configure it as a Windows Task Scheduler job to run periodically (e.g. daily at 5 PM). Make sure to configure SMTP credentials within the `.env` file before executing.
