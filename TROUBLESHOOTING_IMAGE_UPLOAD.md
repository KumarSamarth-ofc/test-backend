# Image Upload Troubleshooting Guide

## Quick Diagnosis

Since the Supabase storage test passed, the issue is likely in your application code. Let's troubleshoot step by step.

## 1. Check Your Environment Variables

Make sure your `.env` file has the correct values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 2. Test the Upload Process

### Step 1: Run the test script
```bash
node test_image_upload.js
```

### Step 2: Test with the test endpoint
```bash
# Start the test server
node test_upload_endpoint.js

# In another terminal, test the upload
curl -X POST http://localhost:3001/test-upload \
  -F "image=@/path/to/your/image.jpg"
```

## 3. Common Issues and Solutions

### Issue 1: "No file uploaded" or "req.file is undefined"

**Cause**: The file field name doesn't match or the request isn't multipart/form-data

**Solution**: 
- Make sure you're sending the file with field name `image`
- Ensure Content-Type is `multipart/form-data`
- Check that multer middleware is properly configured

**Test with curl**:
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Bid" \
  -F "min_budget=100" \
  -F "max_budget=500" \
  -F "image=@/path/to/image.jpg"
```

### Issue 2: "File too large" error

**Cause**: File exceeds 5MB limit

**Solution**: 
- Compress the image
- Reduce image dimensions
- Check the file size before upload

### Issue 3: "Only image files are allowed" error

**Cause**: File isn't recognized as an image

**Solution**:
- Ensure the file has a valid image extension (.jpg, .png, .gif, etc.)
- Check that the file is actually an image file

### Issue 4: Authentication errors

**Cause**: Missing or invalid authentication token

**Solution**:
- Ensure you're sending a valid Bearer token
- Check that the user has brand_owner or admin role

### Issue 5: Database errors

**Cause**: Database migration not run or database connection issues

**Solution**:
- Run the database migration: `ALTER TABLE bids ADD COLUMN image_url TEXT;`
- Check database connection

## 4. Debug Your Application

### Add Debug Logging

Add these console.log statements to your bid controller:

```javascript
// In createBid method, add at the beginning:
console.log('Create bid request received');
console.log('Request body:', req.body);
console.log('Request file:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
} : 'No file');
console.log('User:', req.user);
```

### Check Request Headers

Make sure your frontend is sending the correct headers:

```javascript
// Frontend code
const formData = new FormData();
formData.append('title', 'Test Bid');
formData.append('min_budget', '100');
formData.append('max_budget', '500');
formData.append('image', fileInput.files[0]);

fetch('/api/bids', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - let the browser set it for FormData
    },
    body: formData
});
```

## 5. Test with Different Tools

### Test with Postman
1. Set method to POST
2. Set URL to `http://localhost:3000/api/bids`
3. Add Authorization header: `Bearer YOUR_TOKEN`
4. Use form-data body type
5. Add fields: title, min_budget, max_budget, image (file)

### Test with curl
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Test Bid" \
  -F "min_budget=100" \
  -F "max_budget=500" \
  -F "image=@/path/to/image.jpg" \
  -v
```

## 6. Check Server Logs

Look for these specific error messages in your server logs:

- `"No image file provided"` - File not uploaded
- `"Failed to upload image"` - Supabase storage error
- `"Only image files are allowed"` - File type error
- `"File too large"` - Size limit exceeded
- `"Access denied"` - Authentication/authorization error

## 7. Verify Database Schema

Run this query to ensure the image_url column exists:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bids' 
AND column_name = 'image_url';
```

## 8. Common Frontend Issues

### Issue: FormData not working
```javascript
// Wrong way
const data = {
    title: 'Test',
    image: file
};

// Correct way
const formData = new FormData();
formData.append('title', 'Test');
formData.append('image', file);
```

### Issue: File input not working
```html
<!-- Make sure the input has the correct name -->
<input type="file" name="image" accept="image/*" />
```

### Issue: CORS errors
Make sure your server has CORS configured properly for file uploads.

## 9. Final Checklist

- [ ] Environment variables are set correctly
- [ ] Database migration has been run
- [ ] Supabase storage bucket 'images' exists and is public
- [ ] File is being sent with field name 'image'
- [ ] Content-Type is multipart/form-data
- [ ] Authentication token is valid
- [ ] User has brand_owner or admin role
- [ ] File is under 5MB
- [ ] File is a valid image format

## 10. Still Having Issues?

If you're still experiencing problems:

1. Run the test script: `node test_image_upload.js`
2. Check the server logs for specific error messages
3. Test with the simple test endpoint: `node test_upload_endpoint.js`
4. Share the specific error message you're seeing

The most common issues are:
- Incorrect field name (should be 'image')
- Missing authentication
- File too large
- Wrong Content-Type header

