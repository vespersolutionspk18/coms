# S3 Storage Migration Guide

This document describes how the application's storage has been migrated from local storage to Amazon S3.

## What Was Changed

### 1. Package Installation
- Installed `league/flysystem-aws-s3-v3` package for S3 integration
- This provides the AWS S3 adapter for Laravel's filesystem

### 2. Environment Configuration
Updated `.env.example` to use S3 as the default storage:
```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=your_bucket_name_here
AWS_USE_PATH_STYLE_ENDPOINT=false
```

### 3. Code Changes
Updated all storage references to use the default disk instead of hardcoded local/public disks:

#### Files Modified:
- `app/Http/Controllers/DocumentController.php` - All document operations
- `app/Http/Controllers/ProjectController.php` - Advertisement image handling
- `app/Services/RequirementsGenerationService.php` - Document processing with S3 fallback
- `app/Http/Controllers/OverviewGenerationController.php` - File handling operations

#### Key Changes:
- `Storage::disk('local')` → `Storage::` (uses default disk)
- `Storage::disk('public')` → `Storage::` (uses default disk)
- Added fallback mechanisms in RequirementsGenerationService for PDF/Word processing

## Setup Instructions

### 1. Configure AWS S3 Bucket
1. Create an S3 bucket in your AWS account
2. Configure appropriate permissions (IAM user with S3 access)
3. Note your bucket name and region

### 2. Update Environment Variables
Copy your `.env.example` to `.env` and update these values:
```env
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
AWS_DEFAULT_REGION=your_bucket_region
AWS_BUCKET=your_bucket_name
```

### 3. Test the Configuration
```bash
php artisan tinker
Storage::disk('s3')->put('test.txt', 'Hello S3!');
Storage::disk('s3')->exists('test.txt');
Storage::disk('s3')->get('test.txt');
Storage::disk('s3')->delete('test.txt');
```

## Migration Process

### Existing Files
If you have existing files in local storage that need to be migrated to S3:

1. **Backup your local files** in `storage/app/`
2. **Upload to S3** using AWS CLI or a migration script
3. **Update database paths** if they reference local paths

### Migration Script Example
```php
// Run this in a migration or artisan command
$localFiles = Storage::disk('local')->allFiles('documents');
foreach ($localFiles as $file) {
    $content = Storage::disk('local')->get($file);
    Storage::disk('s3')->put($file, $content);
}
```

## Key Features

### Fallback Mechanism
The `RequirementsGenerationService` includes intelligent fallback:
- First tries S3 (default disk)
- Downloads files temporarily for PDF/Word processing
- Falls back to local disk if S3 is unavailable

### File Processing
For binary file processing (PDFs, Word docs):
- Files are temporarily downloaded from S3 to local filesystem
- Processed using local libraries (PdfParser, PhpWord)
- Temporary files are cleaned up automatically

## Benefits of S3 Migration

1. **Scalability** - Unlimited storage capacity
2. **Durability** - 99.999999999% (11 9's) durability
3. **Availability** - High availability across regions
4. **Security** - Built-in encryption and access controls
5. **Performance** - CDN integration possible
6. **Cost-effective** - Pay only for what you use

## Considerations

### Performance
- Initial file upload/download may be slower than local storage
- Consider implementing CDN for frequently accessed files
- Use presigned URLs for direct client uploads when possible

### Error Handling
- Network connectivity issues may cause timeouts
- Implement retry logic for critical operations
- Monitor AWS service status

### Costs
- Storage costs based on data volume
- Request costs for GET/PUT operations
- Data transfer costs for downloads

## Rollback Plan

To rollback to local storage:
1. Change `FILESYSTEM_DISK=local` in `.env`
2. Download files from S3 to local storage
3. Update any hardcoded S3 references

## Testing Checklist

- [ ] Document upload works
- [ ] Document download works
- [ ] Document deletion works
- [ ] Project advertisement upload works
- [ ] Requirements generation from documents works
- [ ] Overview generation from images works
- [ ] File paths are correctly stored in database
- [ ] Error handling works when S3 is unavailable

## Monitoring

Monitor these metrics:
- S3 request errors
- File upload/download latency
- Storage costs
- Failed operations

## Support

For issues related to S3 storage:
1. Check AWS service status
2. Verify IAM permissions
3. Check Laravel logs for detailed error messages
4. Test connectivity with AWS CLI