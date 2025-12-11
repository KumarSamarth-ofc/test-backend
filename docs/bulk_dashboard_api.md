# Bulk Dashboard API Documentation

This document explicitly details the API endpoints required to build the **Bulk Campaign Dashboard**.
All endpoints require the user to be authenticated as a **Brand Owner**.

## 1. Dashboard "Pulse Check" Stats
**Endpoint**: `GET /api/dashboard/stats`
**Auth**: Bearer Token (Brand Owner)

### Purpose
Provides high-level counters and financial summaries for the top-level dashboard view.

### Response Structure
```json
{
  "success": true,
  "data": {
    "kpis": {
      "active_campaigns": 2,          // Number of campaigns with status='active'
      "total_creators": 15,           // Unique influencers across active campaigns
      "pending_actions": {
        "submission_reviews": 5,      // Content submitted waiting for approval
        "application_reviews": 12     // New applicants waiting for separate bulk review
      },
      "financials": {
        "total_budget_committed": 50000, // Sum of budget for all non-draft campaigns
        "total_spent": 12000             // Sum of final_agreed_amount for completed submissions
      }
    },
    "widgets": {
      "recent_campaigns": [
        {
          "id": "uuid...",
          "title": "Summer Launch",
          "status": "active",
          "updated_at": "2023-10-27T..."
        }
      ]
    }
  }
}
```

### Frontend Implementation Guide
*   **Call Frequency**: Call this on page load.
*   **Real-time Updates**: For "real-time" feel, you can poll this endpoint every 30-60 seconds, OR trigger a refresh when you receive specific socket events (e.g., `notification` of type `work_submitted`).

---

## 2. Bulk Campaign List
**Endpoint**: `GET /api/campaigns?type=BULK`
**Auth**: Bearer Token (Brand Owner)

### Purpose
Lists only the Bulk Campaigns created by the logged-in user, with aggregated counters for each.

### Query Parameters
*   `page`: (Optional) Default 1.
*   `limit`: (Optional) Default 10.
*   `status`: (Optional) Filter by `active`, `draft`, `paused`, `completed`.

### Response Structure
```json
{
  "success": true,
  "campaigns": [
    {
      "id": "uuid...",
      "title": "Summer Influencer Blast",
      "status": "active",
      "budget_total": 50000,
      "created_at": "2023-10-01T...",
      "counters": {
        "applied_count": 45,            // Total applications
        "accepted_count": 20,           // Approved + Working + Completed
        "submissions_pending_count": 5, // Waiting for review
        "invited_count": 0              // (Future use)
      }
    }
    // ... more campaigns
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Data Isolation
*   This endpoint **strictly enforces** `created_by = current_user_id`. Users will NEVER see campaigns they did not create.

---

## 3. Real-Time Data Strategy
To show "real-time" data on the panel:

1.  **Primary Method (Pull)**: Poll `GET /dashboard/stats` every 60 seconds. This is performant and sufficient for dashboard analytics.
2.  **Reactive Method (Push)**: Listen to the existing Socket.IO events.
    *   Event: `notification`
    *   Logic: If notification type is `work_submitted` or `new_application`, trigger a re-fetch of the dashboard stats.
