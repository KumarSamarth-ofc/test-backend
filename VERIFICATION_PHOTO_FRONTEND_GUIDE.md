# Verification Photo Management - Frontend Guide

## Overview

Verification photos are **separate from profile pictures** and are used for identity/document verification. They are stored in a dedicated storage folder and can be replaced at any time.

## API Endpoints

### Upload Verification Document

**Endpoint:** `POST /api/auth/profile/verification-document`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Request Body:**
- `verification_document` (file): The image file to upload
- `document_type` (string): Type of document (required)

**Document Types:**
- `pan_card` - PAN Card
- `aadhaar_card` - Aadhaar Card
- `passport` - Passport
- `driving_license` - Driving License
- `voter_id` - Voter ID

**File Requirements:**
- **Formats:** JPEG, JPG, PNG, WebP
- **Max Size:** 5MB
- **MIME Types:** `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Verification document uploaded successfully",
  "verification_image_url": "https://...",
  "document_type": "pan_card"
}
```

**Error Responses:**

**400 - No file:**
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

**400 - Invalid file type:**
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
}
```

**400 - File too large:**
```json
{
  "success": false,
  "message": "File size too large. Maximum size is 5MB."
}
```

**400 - Invalid document type:**
```json
{
  "success": false,
  "message": "Invalid document type. Must be one of: pan_card, aadhaar_card, passport, driving_license, voter_id"
}
```

**500 - Upload failed:**
```json
{
  "success": false,
  "message": "Failed to upload verification document",
  "error": "..."
}
```

## Frontend Implementation

### TypeScript Types

```typescript
type VerificationDocumentType = 
  | 'pan_card'
  | 'aadhaar_card'
  | 'passport'
  | 'driving_license'
  | 'voter_id';

interface VerificationDocumentUploadResponse {
  success: boolean;
  message: string;
  verification_image_url?: string;
  document_type?: VerificationDocumentType;
  error?: string;
}

interface UserProfile {
  // ... other fields
  verification_image_url?: string | null;
  verification_document_type?: VerificationDocumentType | null;
  verification_status?: 'pending' | 'under_review' | 'verified' | 'rejected';
  is_verified?: boolean;
}
```

### React Component Example

```tsx
import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/config';

type VerificationDocumentType = 
  | 'pan_card'
  | 'aadhaar_card'
  | 'passport'
  | 'driving_license'
  | 'voter_id';

interface VerificationPhotoUploadProps {
  currentDocumentUrl?: string | null;
  currentDocumentType?: VerificationDocumentType | null;
  onUploadSuccess?: (url: string, type: VerificationDocumentType) => void;
}

export const VerificationPhotoUpload: React.FC<VerificationPhotoUploadProps> = ({
  currentDocumentUrl,
  currentDocumentType,
  onUploadSuccess
}) => {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<VerificationDocumentType>('pan_card');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentDocumentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document type options
  const documentTypes: { value: VerificationDocumentType; label: string }[] = [
    { value: 'pan_card', label: 'PAN Card' },
    { value: 'aadhaar_card', label: 'Aadhaar Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'driving_license', label: 'Driving License' },
    { value: 'voter_id', label: 'Voter ID' }
  ];

  // Validate file before selection
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.';
    }

    // Check file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return 'File size too large. Maximum size is 5MB.';
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      setError('Please select a file and document type');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('verification_document', selectedFile);
      formData.append('document_type', documentType);

      const response = await fetch(`${API_BASE_URL}/api/auth/profile/verification-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary
        },
        body: formData
      });

      const data: VerificationDocumentUploadResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      // Update preview with new URL
      if (data.verification_image_url) {
        setPreviewUrl(data.verification_image_url);
      }

      // Reset form
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call success callback
      if (onUploadSuccess && data.verification_image_url && data.document_type) {
        onUploadSuccess(data.verification_image_url, data.document_type);
      }

      // Show success message
      alert('Verification document uploaded successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload verification document');
    } finally {
      setUploading(false);
    }
  };

  // Handle remove/replace
  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(currentDocumentUrl || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="verification-photo-upload">
      <h3>Verification Document</h3>
      <p className="text-sm text-gray-600 mb-4">
        Upload a government-issued ID for verification. This is separate from your profile picture.
      </p>

      {/* Document Type Selection */}
      <div className="mb-4">
        <label htmlFor="document-type" className="block text-sm font-medium mb-2">
          Document Type *
        </label>
        <select
          id="document-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as VerificationDocumentType)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={uploading}
        >
          {documentTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* File Input */}
      <div className="mb-4">
        <label htmlFor="verification-file" className="block text-sm font-medium mb-2">
          Upload Document *
        </label>
        <input
          ref={fileInputRef}
          id="verification-file"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">
          Accepted formats: JPEG, PNG, WebP. Max size: 5MB
        </p>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preview</label>
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Verification document preview"
              className="max-w-full h-auto max-h-64 border border-gray-300 rounded-md"
            />
            {selectedFile && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !documentType}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : currentDocumentUrl ? 'Replace Document' : 'Upload Document'}
        </button>
      )}

      {/* Current Document Info */}
      {currentDocumentUrl && !selectedFile && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-700">
            ✓ Verification document uploaded
            {currentDocumentType && (
              <span className="ml-2">
                ({documentTypes.find(t => t.value === currentDocumentType)?.label})
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};
```

### API Service Function

```typescript
// api/verification.ts

import { API_BASE_URL } from '@/config';

export type VerificationDocumentType = 
  | 'pan_card'
  | 'aadhaar_card'
  | 'passport'
  | 'driving_license'
  | 'voter_id';

export interface VerificationUploadResponse {
  success: boolean;
  message: string;
  verification_image_url?: string;
  document_type?: VerificationDocumentType;
  error?: string;
}

export async function uploadVerificationDocument(
  file: File,
  documentType: VerificationDocumentType,
  token: string
): Promise<VerificationUploadResponse> {
  const formData = new FormData();
  formData.append('verification_document', file);
  formData.append('document_type', documentType);

  const response = await fetch(`${API_BASE_URL}/api/auth/profile/verification-document`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to upload verification document');
  }

  return data;
}
```

### Using with React Query

```typescript
// hooks/useVerificationUpload.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadVerificationDocument } from '@/api/verification';
import { useAuth } from '@/hooks/useAuth';

export function useVerificationUpload() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: VerificationDocumentType }) => {
      return uploadVerificationDocument(file, documentType, token);
    },
    onSuccess: () => {
      // Invalidate user profile query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    }
  });
}

// Usage in component:
const uploadMutation = useVerificationUpload();

const handleUpload = async () => {
  try {
    await uploadMutation.mutateAsync({
      file: selectedFile,
      documentType: documentType
    });
    // Success handled by mutation
  } catch (error) {
    // Error handled by mutation
  }
};
```

## Key Differences from Profile Picture

| Feature | Profile Picture | Verification Photo |
|---------|----------------|-------------------|
| **Purpose** | Display picture for profile | Identity/document verification |
| **Storage Folder** | `profile-images` | `verification-documents` |
| **Field Name** | `profile_image_url` | `verification_image_url` |
| **Document Type** | Not required | Required (`document_type`) |
| **Visibility** | Public/visible in profile | Private/admin-only |
| **Endpoint** | `/api/auth/profile/image` | `/api/auth/profile/verification-document` |
| **Replacement** | Replaces old image | Replaces old image |

## Important Notes

1. **Separate from Profile Picture**: Verification photos are completely separate from profile pictures. They serve different purposes and are stored in different locations.

2. **Document Type Required**: You must specify the document type when uploading. This helps admins categorize and review documents.

3. **Replacement Behavior**: Uploading a new verification document automatically deletes the old one from storage.

4. **File Validation**: Always validate files on the frontend before uploading:
   - File type (JPEG, PNG, WebP only)
   - File size (max 5MB)
   - Document type selection

5. **Preview Before Upload**: Show a preview of the selected file before uploading to ensure the user selected the correct document.

6. **Error Handling**: Handle all error cases gracefully:
   - Network errors
   - File validation errors
   - Server errors
   - Authentication errors

7. **Loading States**: Show loading indicators during upload to provide user feedback.

8. **Success Feedback**: After successful upload, update the UI to show the new document and clear the form.

## User Profile Response

When fetching user profile, you'll receive:

```json
{
  "id": "...",
  "name": "...",
  "profile_image_url": "https://...",  // Profile picture
  "verification_image_url": "https://...",  // Verification document
  "verification_document_type": "pan_card",
  "verification_status": "pending",
  "is_verified": false,
  // ... other fields
}
```

## Displaying Verification Status

```tsx
interface VerificationStatusBadgeProps {
  status: 'pending' | 'under_review' | 'verified' | 'rejected';
  isVerified: boolean;
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  status,
  isVerified
}) => {
  const statusConfig = {
    pending: { label: 'Pending', color: 'yellow', icon: '⏳' },
    under_review: { label: 'Under Review', color: 'blue', icon: '🔍' },
    verified: { label: 'Verified', color: 'green', icon: '✓' },
    rejected: { label: 'Rejected', color: 'red', icon: '✗' }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 rounded text-sm bg-${config.color}-100 text-${config.color}-800`}>
      {config.icon} {config.label}
    </span>
  );
};
```

## Best Practices

1. **Client-Side Validation**: Always validate files before sending to the server to provide immediate feedback.

2. **Progress Indicators**: Show upload progress for better UX (if using XMLHttpRequest or fetch with progress tracking).

3. **Image Compression**: Consider compressing images on the client side before upload to reduce file size and improve upload speed.

4. **Error Recovery**: Allow users to retry failed uploads easily.

5. **Document Type Help**: Provide tooltips or help text explaining what each document type is for.

6. **Privacy Notice**: Inform users that verification documents are private and only visible to admins.

7. **Replace vs Upload**: If a document already exists, show "Replace Document" instead of "Upload Document" to make it clear the action will replace the existing document.

