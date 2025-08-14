# 🚀 Stoory Backend API Documentation

## 📋 Edit Forms API Schema

### **Bid Edit API**

#### **Endpoint:** `PUT /api/bids/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body Schema:**
```json
{
  "title": "string (3-200 chars, optional)",
  "description": "string (optional, max 2000 chars)",
  "min_budget": "number (optional, positive)",
  "max_budget": "number (optional, positive)",
  "requirements": "string (optional, max 1000 chars)",
  "language": "string (optional, max 50 chars)",
  "platform": "string (optional, max 50 chars)",
  "content_type": "string (optional, max 50 chars)",
  "category": "string (optional, max 50 chars)",
  "expiry_date": "string (optional, ISO date)"
}
```

**Example Request:**
```json
{
  "title": "Updated Video Promotion",
  "description": "Updated description for the campaign",
  "min_budget": 2000,
  "max_budget": 8000,
  "requirements": "Updated target audience requirements",
  "language": "English",
  "platform": "Instagram",
  "content_type": "Video",
  "category": "Fashion",
  "expiry_date": "2025-09-30T23:59:59Z"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "title": "Updated Video Promotion",
    "description": "Updated description for the campaign",
    "min_budget": 2000,
    "max_budget": 8000,
    "requirements": "Updated target audience requirements",
    "language": "English",
    "platform": "Instagram",
    "content_type": "Video",
    "category": "Fashion",
    "expiry_date": "2025-09-30T23:59:59Z",
    "status": "open",
    "created_at": "2025-08-12T10:30:00Z",
    "updated_at": "2025-08-12T11:30:00Z"
  },
  "message": "Bid updated successfully"
}
```

**Error Response (400/404/500):**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message"
}
```

---

### **Campaign Edit API**

#### **Endpoint:** `PUT /api/campaigns/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body Schema:**
```json
{
  "name": "string (optional, maps to title)",
  "description": "string (optional)",
  "min_budget": "number (optional)",
  "max_budget": "number (optional)",
  "budget": "number (optional, sets both min and max)",
  "expiryDate": "string (optional, ISO date, maps to end_date)",
  "category": "string (optional, 'product' or 'service')",
  "targetAudience": "string (optional, maps to requirements)",
  "contentType": "string (optional, maps to content_type)",
  "image": "string (optional, image URL)",
  "language": "string (optional)",
  "platform": "string (optional)",
  "sendingPackageToInfluencer": "string (optional, 'yes' or 'no')",
  "noOfPackages": "number (optional)"
}
```

**Example Request:**
```json
{
  "name": "Updated Campaign Title",
  "description": "Updated campaign description",
  "min_budget": 5000,
  "max_budget": 25000,
  "targetAudience": "Updated target audience",
  "language": "English",
  "platform": "Instagram",
  "contentType": "Video",
  "category": "product",
  "expiryDate": "2025-12-31T23:59:59Z",
  "sendingPackageToInfluencer": "yes",
  "noOfPackages": 5
}
```

**Success Response (200):**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "title": "Updated Campaign Title",
    "description": "Updated campaign description",
    "min_budget": 5000,
    "max_budget": 25000,
    "requirements": "Updated target audience",
    "language": "English",
    "platform": "Instagram",
    "content_type": "Video",
    "campaign_type": "product",
    "end_date": "2025-12-31T23:59:59Z",
    "image_url": "https://example.com/image.jpg",
    "sending_package": true,
    "no_of_packages": 5,
    "status": "active",
    "created_at": "2025-08-12T10:30:00Z",
    "updated_at": "2025-08-12T11:30:00Z"
  },
  "message": "Campaign updated successfully"
}
```

**Error Response (400/404/500):**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error message"
}
```

---

## 📸 Image Upload Feature

The API now supports image uploads for bids and campaigns. Images are stored in Supabase Storage and URLs are saved in the database.

### **Image Upload Requirements**
- **File Size:** Maximum 5MB
- **File Types:** Only image files (JPEG, PNG, GIF, etc.)
- **Field Name:** `image`
- **Content-Type:** `multipart/form-data`

### **Image Upload Endpoints**

#### Create Bid with Image
**POST** `/api/bids`
```bash
curl -X POST http://localhost:3000/api/bids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Product Promotion" \
  -F "min_budget=100" \
  -F "max_budget=500" \
  -F "image=@/path/to/image.jpg"
```

#### Update Bid with Image
**PUT** `/api/bids/:id`
```bash
curl -X PUT http://localhost:3000/api/bids/UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Updated Title" \
  -F "image=@/path/to/new-image.jpg"
```

#### Create Campaign with Image
**POST** `/api/campaigns`
```bash
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Campaign Name" \
  -F "budget=1000" \
  -F "image=@/path/to/image.jpg"
```

#### Update Campaign with Image
**PUT** `/api/campaigns/:id`
```bash
curl -X PUT http://localhost:3000/api/campaigns/UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=Updated Name" \
  -F "image=@/path/to/new-image.jpg"
```

### **Image Upload Response**
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

## 🔧 Frontend Implementation Examples

### **Bid Creation with Image Upload (React/JavaScript)**

```javascript
// BidCreateForm.js
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    setError(null);

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.name);
    formDataToSend.append('description', formData.description || '');
    formDataToSend.append('min_budget', formData.minBudget);
    formDataToSend.append('max_budget', formData.maxBudget);
    formDataToSend.append('requirements', formData.targetAudience || '');
    formDataToSend.append('language', formData.language || '');
    formDataToSend.append('platform', formData.platform || '');
    formDataToSend.append('content_type', formData.contentType || '');
    formDataToSend.append('category', formData.category || '');
    formDataToSend.append('expiry_date', formData.expiryDate || '');

    // Add image if selected
    if (formData.image && formData.image[0]) {
      formDataToSend.append('image', formData.image[0]);
    }

    const response = await fetch('/api/bids', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formDataToSend
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage('Bid created successfully!');
      // Navigate back or refresh data
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } else {
      setError(result.message || 'Failed to create bid');
    }
  } catch (error) {
    setError('Network error occurred');
  } finally {
    setLoading(false);
  }
};
```

### **Bid Edit Form with Image Upload (React/JavaScript)**

```javascript
// BidEditForm.js
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    setError(null);

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.name);
    formDataToSend.append('description', formData.description || '');
    formDataToSend.append('min_budget', formData.minBudget);
    formDataToSend.append('max_budget', formData.maxBudget);
    formDataToSend.append('requirements', formData.targetAudience || '');
    formDataToSend.append('language', formData.language || '');
    formDataToSend.append('platform', formData.platform || '');
    formDataToSend.append('content_type', formData.contentType || '');
    formDataToSend.append('category', formData.category || '');
    formDataToSend.append('expiry_date', formData.expiryDate || '');

    // Add image if selected
    if (formData.image && formData.image[0]) {
      formDataToSend.append('image', formData.image[0]);
    }

    const response = await fetch(`/api/bids/${bidId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: formDataToSend
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage('Bid updated successfully!');
      // Navigate back or refresh data
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } else {
      setError(result.message || 'Failed to update bid');
    }
  } catch (error) {
    setError('Network error occurred');
  } finally {
    setLoading(false);
  }
};
```

### **Campaign Edit Form (React/JavaScript)**

```javascript
// CampaignEditForm.js
const handleSubmit = async (formData) => {
  try {
    setLoading(true);
    setError(null);

    const updatePayload = {
      name: formData.name,
      description: formData.description || '',
      min_budget: parseFloat(formData.minBudget),
      max_budget: parseFloat(formData.maxBudget),
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      expiryDate: formData.expiryDate || null,
      category: formData.category || null,
      targetAudience: formData.targetAudience || null,
      contentType: formData.contentType || null,
      image: formData.image || null,
      language: formData.language || null,
      platform: formData.platform || null,
      sendingPackageToInfluencer: formData.sendingPackageToInfluencer || null,
      noOfPackages: formData.noOfPackages ? parseInt(formData.noOfPackages) : null
    };

    console.log('Sending campaign update:', updatePayload);

    const response = await fetch(`/api/campaigns/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(updatePayload)
    });

    const result = await response.json();

    if (result.success) {
      showSuccessMessage('Campaign updated successfully!');
      // Navigate back or refresh data
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } else {
      setError(result.message || 'Failed to update campaign');
    }
  } catch (error) {
    setError('Network error occurred');
  } finally {
    setLoading(false);
  }
};
```

---

## 🧪 Testing

### **Test with cURL**

**Bid Update:**
```bash
curl -X PUT http://localhost:3000/api/bids/YOUR_BID_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Updated Bid Title",
    "min_budget": 2000,
    "max_budget": 8000,
    "requirements": "Updated requirements"
  }'
```

**Campaign Update:**
```bash
curl -X PUT http://localhost:3000/api/campaigns/YOUR_CAMPAIGN_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated Campaign",
    "min_budget": 5000,
    "max_budget": 25000,
    "category": "product"
  }'
```

---

## ✅ **Status: Working**

Both bid and campaign update APIs are now working correctly with:
- ✅ Enhanced error logging
- ✅ Proper field mapping
- ✅ Validation
- ✅ Permission checks
- ✅ Database updates

The backend is ready for your frontend integration! 🚀
