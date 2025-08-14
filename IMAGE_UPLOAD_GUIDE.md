# Image Upload Guide

This guide explains how to use the image upload functionality for bids and campaigns in the Stoory backend.

## Overview

The image upload feature allows brand owners to upload images when creating or updating bids and campaigns. Images are stored in Supabase Storage and the URLs are saved in the database.

## Setup Requirements

### 1. Supabase Storage Bucket

You need to create a storage bucket named `images` in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket named `images`
4. Set the bucket to public (for public access to images)

### 2. Database Migration

Run the following migration to add the `image_url` field to the bids table:

```sql
-- Migration to add image_url field to bids table
ALTER TABLE bids ADD COLUMN image_url TEXT;
```

The campaigns table already has the `image_url` field.

## API Endpoints

### Create Bid with Image

**POST** `/api/bids`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `title` (required): Bid title
- `description` (optional): Bid description
- `min_budget` (required): Minimum budget
- `max_budget` (required): Maximum budget
- `requirements` (optional): Requirements
- `language` (optional): Language
- `platform` (optional): Platform
- `content_type` (optional): Content type
- `category` (optional): Category
- `expiry_date` (optional): Expiry date
- `image` (optional): Image file (max 5MB, image files only)

**Example using curl:**
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Product Promotion" \
  -F "description=Looking for influencers to promote our new product" \
  -F "min_budget=100" \
  -F "max_budget=500" \
  -F "image=@/path/to/image.jpg"
```

### Update Bid with Image

**PUT** `/api/bids/:id`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:** Same as create bid

### Create Campaign with Image

**POST** `/api/campaigns`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- All existing campaign fields
- `image` (optional): Image file (max 5MB, image files only)

### Update Campaign with Image

**PUT** `/api/campaigns/:id`

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:** Same as create campaign

## File Requirements

- **File Size:** Maximum 5MB
- **File Types:** Only image files (JPEG, PNG, GIF, etc.)
- **Field Name:** `image`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Bid Title",
    "image_url": "https://your-project.supabase.co/storage/v1/object/public/images/bids/1234567890_abc123.jpg",
    // ... other fields
  },
  "message": "Bid created successfully"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to upload image",
  "error": "Error details"
}
```

## Frontend Integration

### HTML Form Example
```html
<form action="/api/bids" method="POST" enctype="multipart/form-data">
  <input type="text" name="title" required>
  <input type="file" name="image" accept="image/*">
  <button type="submit">Create Bid</button>
</form>
```

### JavaScript Example
```javascript
const formData = new FormData();
formData.append('title', 'My Bid Title');
formData.append('min_budget', '100');
formData.append('max_budget', '500');

const fileInput = document.querySelector('input[type="file"]');
if (fileInput.files[0]) {
  formData.append('image', fileInput.files[0]);
}

fetch('/api/bids', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Image Storage Structure

Images are stored in Supabase Storage with the following structure:

```
images/
├── bids/
│   ├── 1234567890_abc123.jpg
│   └── 1234567891_def456.png
└── campaigns/
    ├── 1234567892_ghi789.jpg
    └── 1234567893_jkl012.png
```

## Automatic Cleanup

When a bid or campaign is deleted, the associated image is automatically deleted from storage.

## Error Handling

The system handles various error scenarios:

1. **Invalid file type:** Only image files are accepted
2. **File too large:** Maximum 5MB limit
3. **Upload failure:** Network or storage errors
4. **Missing permissions:** Only brand owners and admins can upload images

## Security Considerations

1. **File validation:** Only image files are accepted
2. **Size limits:** 5MB maximum file size
3. **Authentication:** All uploads require valid authentication
4. **Authorization:** Only brand owners and admins can upload images
5. **Unique filenames:** Generated to prevent conflicts

## Troubleshooting

### Common Issues

1. **"Only image files are allowed"**
   - Ensure the file is actually an image
   - Check the file extension

2. **"File too large"**
   - Compress the image or reduce its size
   - Maximum size is 5MB

3. **"Failed to upload image"**
   - Check Supabase Storage configuration
   - Ensure the `images` bucket exists and is public
   - Check network connectivity

4. **"Access denied"**
   - Ensure you're authenticated
   - Verify you have brand_owner or admin role

### Debugging

Enable debug logging by checking the console for detailed error messages when uploads fail.
