from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, ClientViewSet, ProjectViewSet, 
    ClientEmployeeViewSet, TimesheetEntryViewSet, AuditLogViewSet,
    export_timesheet_excel, current_user, register_user, change_password,
    password_reset_request, password_reset_confirm
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet)
router.register(r'clients', ClientViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'client-employees', ClientEmployeeViewSet)
router.register(r'timesheet-entries', TimesheetEntryViewSet)
router.register(r'audit-logs', AuditLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('export/excel/', export_timesheet_excel, name='export_excel'),
    path('me/', current_user, name='current_user'),
    path('register/', register_user, name='register_user'),
    path('change-password/', change_password, name='change_password'),
    path('password-reset-request/', password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/', password_reset_confirm, name='password_reset_confirm'),
]
