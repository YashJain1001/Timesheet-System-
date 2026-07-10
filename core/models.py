from django.db import models
from django.contrib.auth.models import AbstractUser

class Employee(AbstractUser):
    number = models.CharField(max_length=20, blank=True, null=True)
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.username})"


class Client(models.Model):
    name = models.CharField(max_length=100)
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    inserted_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='created_clients')
    updated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='updated_clients')

    def __str__(self):
        return self.name


class Project(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    inserted_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='created_projects')
    updated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='updated_projects')

    def __str__(self):
        return f"{self.code} - {self.name}"

    class Meta:
        ordering = ['code']


class ClientEmployee(models.Model):
    ROLE_CHOICES = [
        ('team_lead', 'Team Lead'),
        ('employee', 'Employee'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='client_assignments')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='employee_assignments')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')
    added_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='added_client_employees')
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    inserted_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='created_assignments')
    updated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='updated_assignments')

    def __str__(self):
        return f"{self.employee.username} -> {self.client.name} ({self.role})"

    class Meta:
        unique_together = ['employee', 'client']


class TimesheetEntry(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('leave', 'Leave'),
        ('holiday', 'Holiday'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='timesheet_entries')
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='timesheet_entries')
    date = models.DateField()
    year = models.IntegerField()
    week_number = models.IntegerField()
    month_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    description = models.TextField(blank=True, null=True)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    inserted_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='created_entries')
    updated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='updated_entries')

    def __str__(self):
        return f"{self.date} - {self.employee.username} ({self.status})"

    class Meta:
        ordering = ['-date', 'employee']
        unique_together = ['date', 'employee', 'client']


class ProjectHours(models.Model):
    entry = models.ForeignKey(TimesheetEntry, on_delete=models.CASCADE, related_name='project_hours')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_hours')
    hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    inserted_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    inserted_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='created_hours')
    updated_by = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='updated_hours')

    def __str__(self):
        return f"{self.entry.date} - {self.project.code}: {self.hours}h"

    class Meta:
        unique_together = ['entry', 'project']


class AuditLog(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    table_name = models.CharField(max_length=100)
    record_id = models.IntegerField(null=True, blank=True)
    action_type = models.CharField(max_length=20)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    change_reason = models.TextField(blank=True, null=True)
    inserted_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.table_name} - {self.action_type} by {self.employee}"
