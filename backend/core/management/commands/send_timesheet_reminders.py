from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from core.models import Employee, TimesheetEntry
import datetime
from zoneinfo import ZoneInfo

class Command(BaseCommand):
    help = 'Sends email reminders to active employees who have not filled their timesheet for today.'

    def handle(self, *args, **options):
        # Determine today's date in IST (Asia/Kolkata)
        try:
            tz = ZoneInfo("Asia/Kolkata")
        except Exception:
            # Fallback to local time if zoneinfo fails
            tz = None
            
        if tz:
            today = datetime.datetime.now(tz).date()
        else:
            today = datetime.date.today()

        self.stdout.write(f"Checking timesheet submissions for today: {today}")

        # Get list of employee IDs who have submitted a timesheet entry for today
        submitted_employee_ids = TimesheetEntry.objects.filter(
            date=today, 
            is_deleted=False
        ).values_list('employee_id', flat=True)

        # Retrieve active employees who are not superusers and have NOT submitted today
        pending_employees = Employee.objects.filter(
            is_active=True,
            is_superuser=False
        ).exclude(
            id__in=submitted_employee_ids
        )

        total_pending = pending_employees.count()
        self.stdout.write(f"Found {total_pending} employee(s) who haven't filled their timesheet today.")

        sent_count = 0
        for employee in pending_employees:
            if not employee.email:
                self.stdout.write(self.style.WARNING(f"Employee '{employee.username}' does not have an email address configured. Skipping."))
                continue

            # Construct the email
            subject = f"Timesheet Reminder - {today.strftime('%Y-%m-%d')}"
            message = (
                f"Hello {employee.first_name or employee.username},\n\n"
                f"This is an automated reminder that you haven't filled out your timesheet for today ({today.strftime('%d-%b-%Y')}).\n"
                f"Please log in to the TimeFlow application (http://localhost:5173/) and complete your timesheet.\n\n"
                f"Thank you,\n"
                f"Timesheet Management System"
            )

            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[employee.email],
                    fail_silently=False
                )
                self.stdout.write(self.style.SUCCESS(f"Successfully sent reminder to {employee.username} ({employee.email})"))
                sent_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send email to {employee.username} ({employee.email}): {e}"))

        self.stdout.write(f"Reminder email run completed. Emails sent: {sent_count}/{total_pending}")
