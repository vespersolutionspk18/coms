# Role-Based Access Control (RBAC) Guide

## Overview
This application uses a comprehensive role-based permissions system to control access to features and data.

## Role Hierarchy

### 1. Superadmin
- **Access Level**: Unrestricted
- **Purpose**: System administration and oversight
- **Key Abilities**:
  - Bypass all tenant restrictions
  - Access all firms and projects
  - Manage system settings
  - View audit logs
  - Impersonate users (if enabled)
- **Use Case**: Platform administrators

### 2. Admin (Firm Administrator)
- **Access Level**: Full access within firm
- **Purpose**: Manage firm operations
- **Key Abilities**:
  - Manage users within firm
  - Create and manage projects
  - Full access to firm resources
  - View analytics for firm
  - Assign roles (below admin level)
- **Use Case**: Firm managers, team leads

### 3. Business Development
- **Access Level**: Project creation and management
- **Purpose**: Business operations and project setup
- **Key Abilities**:
  - Create new projects
  - Manage project details and firms
  - Full document access
  - Create and assign tasks
  - Manage requirements
- **Use Case**: BD team members, project managers

### 4. Consultant
- **Access Level**: Project contribution
- **Purpose**: Work on assigned projects
- **Key Abilities**:
  - View and edit assigned projects
  - Create tasks and requirements
  - Upload documents
  - Edit assigned tasks
- **Use Case**: Regular team members, consultants

### 5. JV Partner
- **Access Level**: Limited collaboration
- **Purpose**: External partner access
- **Key Abilities**:
  - View shared projects
  - View requirements
  - Work on assigned tasks
  - Download documents
- **Use Case**: Joint venture partners, external collaborators

### 6. User
- **Access Level**: Read-only
- **Purpose**: Basic viewing access
- **Key Abilities**:
  - View firm information
  - View projects (read-only)
  - View documents (no download)
- **Use Case**: Observers, new users

## Permission System

### Permission Structure
Permissions follow a dot notation: `resource.action.scope`

Examples:
- `users.view.all` - View all users across firms
- `users.view.own_firm` - View users in own firm only
- `projects.edit.own_firm` - Edit projects involving own firm

### Permission Categories

#### User Management
- `users.view.all` - View all users
- `users.view.own_firm` - View firm users
- `users.create` - Create new users
- `users.edit.all` - Edit any user
- `users.edit.own_firm` - Edit firm users
- `users.delete` - Delete users
- `users.change_role` - Change user roles

#### Firm Management
- `firms.view.all` - View all firms
- `firms.view.own` - View own firm
- `firms.create` - Create firms
- `firms.edit.all` - Edit any firm
- `firms.edit.own` - Edit own firm
- `firms.delete` - Delete firms

#### Project Management
- `projects.view.all` - View all projects
- `projects.view.own_firm` - View firm projects
- `projects.create` - Create projects
- `projects.edit.all` - Edit any project
- `projects.edit.own_firm` - Edit firm projects
- `projects.delete` - Delete projects
- `projects.manage_firms` - Add/remove firms

#### Document Management
- `documents.view.all` - View all documents
- `documents.view.own_firm` - View firm documents
- `documents.upload` - Upload documents
- `documents.edit` - Edit metadata
- `documents.delete` - Delete documents
- `documents.download` - Download documents

## Usage in Code

### Checking Permissions in Controllers

```php
use App\Services\RolePermissionService;

// Check if user has permission
if (!RolePermissionService::hasPermission($user, 'projects.create')) {
    abort(403);
}

// Check permission with resource
if (!RolePermissionService::can($user, 'projects.edit.own_firm', $project)) {
    abort(403);
}
```

### Using Laravel Gates

```php
// In controllers
if (!Gate::allows('projects.create')) {
    abort(403);
}

// In Blade templates
@can('projects.create')
    <button>Create Project</button>
@endcan

// With resource
@can('access-resource', $project)
    <a href="{{ route('projects.edit', $project) }}">Edit</a>
@endcan
```

### Route Protection

```php
// Single permission
Route::get('/users', [UserController::class, 'index'])
    ->middleware('permission:users.view.all');

// Multiple roles (OR logic)
Route::get('/admin', [AdminController::class, 'index'])
    ->middleware('role:superadmin,admin');

// Combined with tenant isolation
Route::resource('projects', ProjectController::class)
    ->middleware(['permission:projects.create', 'tenant.isolation']);
```

## CLI Commands

### View User Role
```bash
php artisan user:role user@example.com
```

### Change User Role
```bash
php artisan user:role user@example.com consultant
```

### List All Roles
```bash
php artisan user:role user@example.com --list
```

### Show Role Permissions
```bash
php artisan user:role user@example.com --permissions
```

## Role Assignment Rules

### Who Can Assign Roles?
- **Superadmin**: Can assign any role
- **Admin**: Can assign roles below admin level
- **Others**: Cannot assign roles

### Role Hierarchy for Assignment
1. Superadmin (highest)
2. Admin
3. Business Development
4. Consultant
5. JV Partner
6. User (lowest)

Users can only assign roles lower than their own level.

## Security Considerations

### Audit Logging
All role changes are logged with:
- Who made the change
- What was changed
- When it happened
- IP address and user agent

### Permission Denials
Failed permission checks are logged for security monitoring.

### Superadmin Actions
All superadmin bypasses are logged for accountability.

## Best Practices

### 1. Principle of Least Privilege
Assign the minimum role necessary for users to perform their duties.

### 2. Regular Audits
Review role assignments quarterly:
```bash
php artisan tenant:verify
```

### 3. Role Documentation
Document why users have specific roles in the user notes field.

### 4. Separation of Duties
Don't combine incompatible permissions in a single role.

### 5. Testing Permissions
Always test permission changes in staging:
```bash
php artisan test --filter RolePermissionTest
```

## Troubleshooting

### User Can't Access Feature
1. Check current role: `php artisan user:role email@example.com`
2. View role permissions: `php artisan user:role email@example.com --permissions`
3. Check audit logs for permission denials
4. Verify tenant isolation isn't blocking access

### Permission Not Working
1. Clear cache: `php artisan cache:clear`
2. Check middleware is applied to route
3. Verify permission name is correct
4. Check Gate registration in service provider

### Role Change Not Taking Effect
1. User may need to log out and back in
2. Clear session: `php artisan session:clear`
3. Check for cached permissions

## Migration Path

### From Old Role System
1. Run migration: `php artisan migrate`
2. Roles are automatically mapped:
   - `Admin` → `admin`
   - `BD` → `business_development`
   - `Consultant` → `consultant`
   - `JV Partner User` → `jv_partner`

### Adding New Permissions
1. Add to `RolePermissionService::PERMISSIONS`
2. Assign to roles in `ROLE_PERMISSIONS`
3. Clear cache: `php artisan cache:clear`

## Support

For role-related issues:
1. Check this documentation
2. Review audit logs
3. Contact system administrator
4. File issue with security team if suspected breach