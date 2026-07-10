from django.db import models
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.forms.models import model_to_dict
from .models import Employee, Client, Project, ClientEmployee, TimesheetEntry, ProjectHours, AuditLog
from .serializers import (
    EmployeeSerializer, ClientSerializer, ProjectSerializer, 
    ClientEmployeeSerializer, TimesheetEntrySerializer, AuditLogSerializer
)
import datetime
import os
from django.conf import settings
from django.core.mail import send_mail

# ============================================================
# Audit Logging Helper
# ============================================================
def log_audit(request, table_name, record_id, action_type, old_obj=None, new_obj=None, reason=None):
    try:
        user = request.user if request and request.user.is_authenticated else None
        old_data = model_to_dict(old_obj) if old_obj else None
        new_data = model_to_dict(new_obj) if new_obj else None
        
        # Serialize fields that might not be JSON serializable
        def clean_dict(d):
            if not d: return d
            cleaned = {}
            for k, v in d.items():
                if isinstance(v, (datetime.date, datetime.datetime)):
                    cleaned[k] = v.isoformat()
                elif hasattr(v, '__str__') and not isinstance(v, (str, int, float, bool, type(None))):
                    cleaned[k] = str(v)
                else:
                    cleaned[k] = v
            return cleaned

        AuditLog.objects.create(
            employee=user,
            table_name=table_name,
            record_id=record_id,
            action_type=action_type,
            old_data=clean_dict(old_data),
            new_data=clean_dict(new_data),
            change_reason=reason or request.data.get('change_reason', '') if request else ''
        )
    except Exception as e:
        print(f"Failed to write audit log: {e}")

# ============================================================
# ViewSets with Role-based Querysets & Audit Logging
# ============================================================

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'username']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Employee.objects.none()
        if user.is_superuser:
            return Employee.objects.all()
        
        # Team Lead can see employees assigned to their clients
        client_ids = ClientEmployee.objects.filter(employee=user, role='team_lead').values_list('client_id', flat=True)
        if client_ids.exists():
            assigned_emp_ids = ClientEmployee.objects.filter(client_id__in=client_ids).values_list('employee_id', flat=True)
            return Employee.objects.filter(models.Q(id__in=assigned_emp_ids) | models.Q(id=user.id))
        
        # Normal employee can only see themselves
        return Employee.objects.filter(id=user.id)

    def perform_create(self, serializer):
        obj = serializer.save()
        log_audit(self.request, 'Employee', obj.id, 'CREATE', new_obj=obj)

    def perform_update(self, serializer):
        old_obj = self.get_object()
        obj = serializer.save()
        log_audit(self.request, 'Employee', obj.id, 'UPDATE', old_obj=old_obj, new_obj=obj)

    def perform_destroy(self, instance):
        log_audit(self.request, 'Employee', instance.id, 'DELETE', old_obj=instance)
        instance.delete()


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Client.objects.none()
        if user.is_superuser:
            return Client.objects.all()
        
        # Team Lead & Employee see assigned clients
        client_ids = ClientEmployee.objects.filter(employee=user).values_list('client_id', flat=True)
        return Client.objects.filter(id__in=client_ids)

    def perform_create(self, serializer):
        obj = serializer.save(inserted_by=self.request.user)
        log_audit(self.request, 'Client', obj.id, 'CREATE', new_obj=obj)

    def perform_update(self, serializer):
        old_obj = self.get_object()
        obj = serializer.save(updated_by=self.request.user)
        log_audit(self.request, 'Client', obj.id, 'UPDATE', old_obj=old_obj, new_obj=obj)

    def perform_destroy(self, instance):
        log_audit(self.request, 'Client', instance.id, 'DELETE', old_obj=instance)
        instance.delete()


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['client']
    search_fields = ['name', 'code']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Project.objects.none()
        if user.is_superuser:
            return Project.objects.all()
        
        # Filter projects under assigned clients
        client_ids = ClientEmployee.objects.filter(employee=user).values_list('client_id', flat=True)
        return Project.objects.filter(client_id__in=client_ids)

    def perform_create(self, serializer):
        obj = serializer.save(inserted_by=self.request.user)
        log_audit(self.request, 'Project', obj.id, 'CREATE', new_obj=obj)

    def perform_update(self, serializer):
        old_obj = self.get_object()
        obj = serializer.save(updated_by=self.request.user)
        log_audit(self.request, 'Project', obj.id, 'UPDATE', old_obj=old_obj, new_obj=obj)

    def perform_destroy(self, instance):
        log_audit(self.request, 'Project', instance.id, 'DELETE', old_obj=instance)
        instance.delete()


class ClientEmployeeViewSet(viewsets.ModelViewSet):
    queryset = ClientEmployee.objects.all()
    serializer_class = ClientEmployeeSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['client', 'employee', 'role']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ClientEmployee.objects.none()
        if user.is_superuser:
            return ClientEmployee.objects.all()
        
        # Team Lead can see assignments for their client, and everyone can see their own assignments
        client_ids = ClientEmployee.objects.filter(employee=user, role='team_lead').values_list('client_id', flat=True)
        return ClientEmployee.objects.filter(
            models.Q(employee=user) | models.Q(client_id__in=client_ids)
        )

    def perform_create(self, serializer):
        obj = serializer.save(added_by=self.request.user, inserted_by=self.request.user)
        log_audit(self.request, 'ClientEmployee', obj.id, 'CREATE', new_obj=obj)

    def perform_update(self, serializer):
        old_obj = self.get_object()
        obj = serializer.save(updated_by=self.request.user)
        log_audit(self.request, 'ClientEmployee', obj.id, 'UPDATE', old_obj=old_obj, new_obj=obj)

    def perform_destroy(self, instance):
        log_audit(self.request, 'ClientEmployee', instance.id, 'DELETE', old_obj=instance)
        instance.delete()


class TimesheetEntryViewSet(viewsets.ModelViewSet):
    queryset = TimesheetEntry.objects.all()
    serializer_class = TimesheetEntrySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'client', 'month_number', 'year', 'status', 'week_number']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return TimesheetEntry.objects.none()
        if user.is_superuser:
            return TimesheetEntry.objects.all()
        
        # Team Lead can view entries for their client
        client_ids = ClientEmployee.objects.filter(employee=user, role='team_lead').values_list('client_id', flat=True)
        if client_ids.exists():
            return TimesheetEntry.objects.filter(models.Q(client_id__in=client_ids) | models.Q(employee=user))
        
        # Employee can only view own entries
        return TimesheetEntry.objects.filter(employee=user)

    def perform_create(self, serializer):
        obj = serializer.save(inserted_by=self.request.user)
        log_audit(self.request, 'TimesheetEntry', obj.id, 'CREATE', new_obj=obj)

    def perform_update(self, serializer):
        old_obj = self.get_object()
        obj = serializer.save(updated_by=self.request.user)
        log_audit(self.request, 'TimesheetEntry', obj.id, 'UPDATE', old_obj=old_obj, new_obj=obj)

    def perform_destroy(self, instance):
        log_audit(self.request, 'TimesheetEntry', instance.id, 'DELETE', old_obj=instance)
        instance.delete()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['table_name', 'action_type', 'employee']

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.is_superuser:
            return AuditLog.objects.all()
        return AuditLog.objects.none()


# ============================================================
# Custom Auth Endpoints (/me/ & /register/)
# ============================================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = EmployeeSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Send registration confirmation email
        if user.email:
            subject = "Welcome to TimeFlow - Registration Successful"
            frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
            message = f"Hi {user.first_name or user.username},\n\n" \
                      f"Your TimeFlow account has been successfully created!\n\n" \
                      f"Here are your details:\n" \
                      f"Username: {user.username}\n" \
                      f"Email: {user.email}\n\n" \
                      f"You can log in at: {frontend_url}/login\n\n" \
                      f"Best regards,\n" \
                      f"The TimeFlow Team"
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Error sending registration welcome email: {e}")
                
        return Response(EmployeeSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    user = request.user
    
    # Check roles and client assignments
    assignments = ClientEmployee.objects.filter(employee=user)
    
    is_team_lead = assignments.filter(role='team_lead').exists()
    
    primary_assignment = assignments.first()
    client_id = primary_assignment.client.id if primary_assignment else None
    client_name = primary_assignment.client.name if primary_assignment else None
    
    clients_list = [
        {
            'client_id': a.client.id,
            'client_name': a.client.name,
            'role': a.role
        } for a in assignments
    ]
    
    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'number': user.number,
        'is_superuser': user.is_superuser,
        'is_team_lead': is_team_lead,
        'client_id': client_id,
        'client_name': client_name,
        'employee_id': user.id,
        'employee_name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'clients': clients_list
    }
    
    return Response(data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not old_password or not new_password:
        return Response({"detail": "Both old_password and new_password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    if not user.check_password(old_password):
        return Response({"old_password": ["Incorrect current password."]}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    
    # Audit log password change
    log_audit(None, 'Employee', user.id, 'PASSWORD_CHANGE', reason="Password changed by user")
    
    return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


import openpyxl
from django.http import HttpResponse

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_timesheet_excel(request):
    year = request.GET.get('year')
    month = request.GET.get('month')
    client_id = request.GET.get('client_id')
    
    q = TimesheetEntry.objects.all()
    if year: q = q.filter(year=year)
    if month: q = q.filter(month_number=month)
    if client_id: q = q.filter(client_id=client_id)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Timesheet Export"
    ws.append(["Date", "Employee", "Task", "Status", "Hours"])
    for entry in q:
        for ph in entry.project_hours.all():
            ws.append([
                entry.date.strftime("%Y-%m-%d"),
                f"{entry.employee.first_name} {entry.employee.last_name}".strip() or entry.employee.username,
                entry.description or "",
                entry.status,
                float(ph.hours)
            ])
            
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="timesheet_{year}_{month}.xlsx"'
    wb.save(response)
    return response


from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    email = request.data.get('email')
    if not email:
        return Response({"email": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)
    
    # Check for active employee
    user = Employee.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response({"email": ["This email address is not registered."]}, status=status.HTTP_400_BAD_REQUEST)
        
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    
    subject = "TimeFlow - Reset Your Password"
    message = f"""Hi {user.first_name or user.username},

You are receiving this email because a password reset was requested for your TimeFlow account.

Please click the link below to reset your password:
{reset_link}

If you did not request this, please ignore this email.

Best regards,
The TimeFlow Team"""
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error sending reset email: {e}")
        return Response({"detail": "Failed to send password reset email. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    return Response({"detail": "If your email is registered, you will receive a password reset link shortly."}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    errors = {}
    if not uid:
        errors['uid'] = ["This field is required."]
    if not token:
        errors['token'] = ["This field is required."]
    if not new_password:
        errors['new_password'] = ["This field is required."]
    elif len(new_password) < 8:
        errors['new_password'] = ["Password must be at least 8 characters."]
        
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        uid_decoded = force_str(urlsafe_base64_decode(uid))
        user = Employee.objects.get(pk=uid_decoded, is_active=True)
    except (TypeError, ValueError, OverflowError, Employee.DoesNotExist):
        return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)
        
    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Invalid or expired reset token."}, status=status.HTTP_400_BAD_REQUEST)
        
    user.set_password(new_password)
    user.save()
    
    log_audit(request, 'Employee', user.id, 'PASSWORD_RESET', reason="Password reset via email token")
    return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)

