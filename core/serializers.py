from rest_framework import serializers
from .models import Employee, Client, Project, ClientEmployee, TimesheetEntry, ProjectHours, AuditLog

class EmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Employee
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'number', 'is_active', 'is_superuser', 'inserted_on', 'password'
        ]
        read_only_fields = ['id', 'inserted_on']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        employee = Employee.objects.create(**validated_data)
        if password:
            employee.set_password(password)
            employee.save()
        return employee

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ClientSerializer(serializers.ModelSerializer):
    inserted_by_name = serializers.CharField(source='inserted_by.username', read_only=True)

    class Meta:
        model = Client
        fields = ['id', 'name', 'inserted_on', 'is_deleted', 'inserted_by_name']
        read_only_fields = ['id', 'inserted_on']


class ProjectSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.name', read_only=True)
    inserted_by_name = serializers.CharField(source='inserted_by.username', read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'client', 'client_name', 'name', 'code', 'description', 'is_active', 'inserted_on', 'inserted_by_name']
        read_only_fields = ['id', 'inserted_on']


class ClientEmployeeSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField(read_only=True)
    employee_email = serializers.CharField(source='employee.email', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    added_by_name = serializers.CharField(source='added_by.username', read_only=True)

    class Meta:
        model = ClientEmployee
        fields = [
            'id', 'employee', 'employee_name', 'employee_email',
            'client', 'client_name', 'role', 'inserted_on', 'added_by_name'
        ]
        read_only_fields = ['id', 'inserted_on']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.username


class ProjectHoursSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    project_code = serializers.CharField(source='project.code', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ProjectHours
        fields = ['id', 'project', 'project_code', 'project_name', 'hours']


class TimesheetEntrySerializer(serializers.ModelSerializer):
    project_hours = ProjectHoursSerializer(many=True, required=False)
    employee_name = serializers.SerializerMethodField(read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)

    class Meta:
        model = TimesheetEntry
        fields = [
            'id', 'employee', 'employee_name', 'client', 'client_name', 'date', 
            'year', 'week_number', 'month_number', 'status', 'description', 
            'total_hours', 'project_hours', 'inserted_on'
        ]
        read_only_fields = ['id', 'year', 'week_number', 'month_number', 'total_hours', 'inserted_on']

    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.username

    def create(self, validated_data):
        project_hours_data = validated_data.pop('project_hours', [])
        
        # Auto-compute fields
        date = validated_data['date']
        validated_data['year'] = date.year
        validated_data['month_number'] = date.month
        validated_data['week_number'] = date.isocalendar()[1]
        
        if validated_data.get('status') in ['leave', 'holiday']:
            validated_data['total_hours'] = 0
            project_hours_data = []
        else:
            validated_data['total_hours'] = sum(ph['hours'] for ph in project_hours_data)

        entry = TimesheetEntry.objects.create(**validated_data)
        
        for ph in project_hours_data:
            ProjectHours.objects.create(entry=entry, project=ph['project'], hours=ph['hours'])
            
        return entry

    def update(self, instance, validated_data):
        project_hours_data = validated_data.pop('project_hours', None)
        
        if 'date' in validated_data:
            date = validated_data['date']
            instance.date = date
            instance.year = date.year
            instance.month_number = date.month
            instance.week_number = date.isocalendar()[1]
            
        instance.status = validated_data.get('status', instance.status)
        instance.description = validated_data.get('description', instance.description)
        instance.client = validated_data.get('client', instance.client)

        if instance.status in ['leave', 'holiday']:
            instance.total_hours = 0
            instance.project_hours.all().delete()
        elif project_hours_data is not None:
            instance.project_hours.all().delete()
            total_hours = 0
            for ph in project_hours_data:
                ProjectHours.objects.create(entry=instance, project=ph['project'], hours=ph['hours'])
                total_hours += ph['hours']
            instance.total_hours = total_hours

        instance.save()
        return instance


class AuditLogSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'employee', 'employee_name', 'table_name', 'record_id', 
            'action_type', 'old_data', 'new_data', 'change_reason', 'inserted_on'
        ]
        read_only_fields = ['id', 'inserted_on']
