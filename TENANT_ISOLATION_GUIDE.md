# Tenant Isolation Implementation Guide

## Overview
This application implements multi-tenant isolation to ensure data security and privacy across different firms. This guide documents the implementation and best practices.

## Architecture

### 1. Global Query Scopes (Implemented)
All models that contain tenant-specific data use the `BelongsToTenant` trait which automatically filters queries based on the current user's firm.

```php
use App\Traits\BelongsToTenant;

class Project extends Model
{
    use BelongsToTenant;
}
```

### 2. Automatic Filtering
When a model uses `BelongsToTenant`, all queries are automatically filtered:

- **Regular Users**: Only see data from their own firm
- **Superadmins**: See all data (but actions are logged)

### 3. Models with Tenant Isolation

The following models have automatic tenant filtering:
- `Project` - Filtered by firm association
- `Task` - Filtered through project relationship
- `Requirement` - Filtered through project relationship  
- `Document` - Filtered by firm_id or project relationship
- `Milestone` - Filtered through project relationship
- `User` - Filtered by firm_id

## Security Layers

### Layer 1: Global Query Scopes
- Automatic filtering at the database query level
- Prevents accidental data exposure
- Applied before any query execution

### Layer 2: Middleware Protection
- `TenantIsolationMiddleware` - Validates resource access
- Checks route parameters and request data
- Blocks unauthorized cross-tenant access

### Layer 3: Controller Validation
- Additional checks in controller methods
- Business logic validation
- Relationship integrity checks

### Layer 4: Model-Level Validation
- `userCanAccess()` method on each model
- Instance-level access checks
- Relationship validation

## Audit Logging

All superadmin actions and cross-tenant access attempts are logged:

### Log Channels
- `storage/logs/superadmin.log` - All superadmin actions
- `storage/logs/security.log` - Security events and violations
- `storage/logs/laravel.log` - General application logs

### Logged Events
- Superadmin resource access
- Cross-tenant access attempts
- Permission overrides
- Role changes
- User/Firm/Project deletions

## Developer Guidelines

### 1. Creating New Models
If creating a new model that should be tenant-isolated:

```php
use App\Traits\BelongsToTenant;

class NewModel extends Model
{
    use BelongsToTenant;
    
    // Ensure firm_id or project relationship exists
}
```

### 2. Bypassing Tenant Scopes (Use Carefully!)
Only use when absolutely necessary and ensure proper authorization:

```php
// Only for superadmin operations
if ($user->isSuperadmin()) {
    $allProjects = Project::withoutTenantScope()->get();
    
    // Log the action
    AuditService::log('bypass_tenant_scope', null, [
        'model' => 'Project',
        'reason' => 'Administrative report generation'
    ]);
}
```

### 3. Checking Access
Always verify access when dealing with relationships:

```php
$project = Project::find($id);
if (!$project->userCanAccess()) {
    abort(403);
}
```

### 4. Creating Relationships
When creating relationships between models, validate firm access:

```php
// Validate user belongs to a firm with project access
if (!$project->canAssignUser($userId, auth()->user())) {
    abort(403, 'User does not have access to this project');
}
```

## Testing Tenant Isolation

### Manual Testing Checklist
- [ ] Create users in different firms
- [ ] Verify User A cannot see User B's projects
- [ ] Verify User A cannot access User B's documents
- [ ] Verify User A cannot modify User B's tasks
- [ ] Test superadmin can access all resources
- [ ] Verify audit logs are created for superadmin actions

### Query Testing
```php
// This should only return current user's firm data
$projects = Project::all(); 

// This should fail for non-superadmins accessing other firms
$otherFirmProject = Project::find($otherFirmProjectId);
```

## Common Pitfalls to Avoid

### ❌ DON'T: Direct Database Queries
```php
// BAD - Bypasses tenant scoping
DB::table('projects')->get();
```

### ✅ DO: Use Eloquent Models
```php
// GOOD - Applies tenant scoping
Project::all();
```

### ❌ DON'T: Manually Filter in Controllers
```php
// BAD - Error prone and inconsistent
$projects = Project::where('firm_id', $user->firm_id)->get();
```

### ✅ DO: Rely on Global Scopes
```php
// GOOD - Automatic filtering
$projects = Project::all();
```

### ❌ DON'T: Share IDs Between Tenants
```php
// BAD - Exposes internal IDs
return response()->json(['project_id' => $project->id]);
```

### ✅ DO: Validate Access Before Exposing Data
```php
// GOOD - Verify access first
if ($project->userCanAccess()) {
    return response()->json(['project' => $project]);
}
```

## Monitoring & Alerts

### Key Metrics to Monitor
1. Failed access attempts (403 errors)
2. Cross-tenant access by superadmins
3. Unusual query patterns
4. Permission override frequency

### Alert Conditions
- Multiple failed access attempts from same user
- Non-superadmin attempting cross-tenant access
- Unusual spike in superadmin overrides
- Access patterns outside business hours

## Compliance & Reporting

### Audit Report Generation
```bash
# Generate superadmin activity report
grep "superadmin_access" storage/logs/superadmin.log | tail -100

# Check for cross-tenant access
grep "cross_tenant_access" storage/logs/security.log

# Failed access attempts
grep "403" storage/logs/laravel.log | grep -v "superadmin"
```

### Compliance Checklist
- [ ] All tenant data is isolated by default
- [ ] Superadmin actions are logged
- [ ] Audit logs are retained for required period
- [ ] Regular security audits are performed
- [ ] Access violations are investigated

## Emergency Procedures

### Suspected Data Breach
1. Check security logs for unauthorized access
2. Review audit logs for affected period
3. Identify affected tenants
4. Document timeline of events
5. Notify affected parties per policy

### Disabling a Compromised Account
```php
$user = User::withoutTenantScope()->find($userId);
$user->status = 'Inactive';
$user->save();

AuditService::log('emergency_account_disable', $user, [
    'reason' => 'Security incident',
    'disabled_by' => auth()->user()->id
]);
```

## Support & Maintenance

### Regular Maintenance Tasks
- Review audit logs weekly
- Check for orphaned records monthly
- Validate relationship integrity quarterly
- Update this documentation as needed

### Troubleshooting
If tenant isolation appears to not be working:
1. Verify model uses `BelongsToTenant` trait
2. Check if user has firm_id assigned
3. Review middleware configuration
4. Check for direct database queries
5. Review recent code changes

## Version History
- v1.0 - Initial implementation with global scopes
- v1.1 - Added audit logging
- v1.2 - Enhanced middleware protection
- Current - Comprehensive multi-layer protection