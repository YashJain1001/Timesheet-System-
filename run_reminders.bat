@echo off
REM ============================================================
REM Timesheet Reminder Script
REM Replace these placeholder values with your actual SMTP details
REM ============================================================
set EMAIL_HOST=smtp.gmail.com
set EMAIL_PORT=587
set EMAIL_USE_TLS=True
set EMAIL_HOST_USER=your-email@gmail.com
set EMAIL_HOST_PASSWORD=your-app-password
set DEFAULT_FROM_EMAIL=your-email@gmail.com

REM Navigate to the directory of this batch file
cd /d "%~dp0"

REM Run the Django management command using the virtual environment's python
.\venv\Scripts\python.exe manage.py send_timesheet_reminders
