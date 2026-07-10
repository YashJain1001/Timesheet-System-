import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'timesheet_project.settings')
django.setup()

from core.models import Employee, Client, Project, ClientEmployee

def seed():
    # 1. Create superuser 'admin'
    admin, created = Employee.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@example.com',
            'first_name': 'System',
            'last_name': 'Admin',
            'is_superuser': True,
            'is_staff': True,
            'is_active': True,
            'number': '9999999999'
        }
    )
    if created or admin:
        admin.set_password('admin123')
        admin.save()
        print("Superuser 'admin' created/updated with password 'admin123'")

    # 2. Create Clients
    acme, _ = Client.objects.get_or_create(name='Acme Corporation', defaults={'inserted_by': admin})
    globex, _ = Client.objects.get_or_create(name='Globex Corporation', defaults={'inserted_by': admin})
    print("Clients 'Acme Corporation' and 'Globex Corporation' created")

    # 3. Create Projects
    p1, _ = Project.objects.get_or_create(
        code='ACME-WEB', 
        defaults={'client': acme, 'name': 'Website Redesign', 'is_active': True, 'inserted_by': admin}
    )
    p2, _ = Project.objects.get_or_create(
        code='ACME-APP', 
        defaults={'client': acme, 'name': 'Mobile App Development', 'is_active': True, 'inserted_by': admin}
    )
    p3, _ = Project.objects.get_or_create(
        code='GLOB-SEO', 
        defaults={'client': globex, 'name': 'SEO Optimization', 'is_active': True, 'inserted_by': admin}
    )
    print("Projects created: ACME-WEB, ACME-APP, GLOB-SEO")

    # 4. Create Team Lead
    tl, created_tl = Employee.objects.get_or_create(
        username='teamlead',
        defaults={
            'email': 'teamlead@example.com',
            'first_name': 'Sarah',
            'last_name': 'Connor',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'number': '8888888888'
        }
    )
    if created_tl or tl:
        tl.set_password('admin123')
        tl.save()
        print("Team Lead 'teamlead' created/updated with password 'admin123'")

    # Assign Team Lead to Acme Corporation
    ClientEmployee.objects.get_or_create(
        employee=tl,
        client=acme,
        defaults={'role': 'team_lead', 'added_by': admin, 'inserted_by': admin}
    )
    print("Sarah Connor assigned as Team Lead for Acme Corporation")

    # 5. Create Employee
    emp, created_emp = Employee.objects.get_or_create(
        username='employee',
        defaults={
            'email': 'employee@example.com',
            'first_name': 'John',
            'last_name': 'Doe',
            'is_superuser': False,
            'is_staff': False,
            'is_active': True,
            'number': '7777777777'
        }
    )
    if created_emp or emp:
        emp.set_password('admin123')
        emp.save()
        print("Employee 'employee' created/updated with password 'admin123'")

    # Assign Employee to Acme Corporation
    ClientEmployee.objects.get_or_create(
        employee=emp,
        client=acme,
        defaults={'role': 'employee', 'added_by': tl, 'inserted_by': tl}
    )
    print("John Doe assigned as Employee for Acme Corporation")

if __name__ == '__main__':
    seed()
