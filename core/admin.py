from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Employee, Client, Project, ClientEmployee, TimesheetEntry, ProjectHours, AuditLog

@admin.register(Employee)
class EmployeeAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Info', {'fields': ('number', 'is_deleted')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Info', {'fields': ('number', 'is_deleted')}),
    )

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'inserted_on', 'inserted_by')
    search_fields = ('name',)

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'client', 'is_active')
    list_filter = ('is_active', 'client')
    search_fields = ('code', 'name')

@admin.register(ClientEmployee)
class ClientEmployeeAdmin(admin.ModelAdmin):
    list_display = ('employee', 'client', 'role', 'inserted_on')
    list_filter = ('role', 'client')

class ProjectHoursInline(admin.TabularInline):
    model = ProjectHours
    extra = 1

@admin.register(TimesheetEntry)
class TimesheetEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'employee', 'client', 'status', 'total_hours')
    list_filter = ('status', 'client', 'employee')
    inlines = [ProjectHoursInline]

@admin.register(ProjectHours)
class ProjectHoursAdmin(admin.ModelAdmin):
    list_display = ('entry', 'project', 'hours')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('table_name', 'record_id', 'action_type', 'employee', 'inserted_on')
    list_filter = ('action_type', 'table_name')
    readonly_fields = ('employee', 'table_name', 'record_id', 'action_type', 'old_data', 'new_data', 'change_reason', 'inserted_on')
