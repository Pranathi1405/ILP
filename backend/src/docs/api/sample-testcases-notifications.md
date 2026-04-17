/** AUTHORS: Harshitha Ravuri **/

# **Notifications API – Test Cases & Expected Behavior**

## **Endpoint**

    GET /api/notifications?page=1&limit=20

**Authentication:** Required (Access Token in Cookies)  
**Method:** `GET`  
**Pagination:** Supported ✅

***

# **1. Fetch Notifications – Success Case**

## **Scenario**

A valid, authenticated user requests notifications and has existing records.

### **Preconditions**

*   **User ID:** `35`
*   Database contains **10 notifications** for the user.

### **Request**

    GET /api/notifications?page=1&limit=5

**Cookie**

    accessToken=valid_jwt

### **Expected Status Code**

    200 OK

### **Expected Response**

```json
{
  "success": true,
  "message": "Notifications fetched successfully for user ID: 35",
  "data": {
    "notifications": [
      {
        "notification_id": 10,
        "title": "Live Class Starting Soon",
        "message": "Your live class starts in 30 minutes.",
        "notification_type": "live_class",
        "is_read": 0,
        "delivery_method": "push",
        "status": "sent",
        "created_at": "2026-03-02T07:10:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 10,
      "total_pages": 2,
      "has_next": true
    }
  }
}
```

***

# **2. No Notifications Case**

## **Scenario**

Authenticated user with **no notifications**.

### **Preconditions**

*   **User ID:** `50`
*   Database contains **0 notifications**

### **Expected Status Code**

    200 OK

### **Expected Response**

```json
{
  "success": true,
  "message": "Notifications fetched successfully for user ID: 50",
  "data": {
    "notifications": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "total_pages": 0,
      "has_next": false
    }
  }
}
```

***

# **3. Missing Access Token**

## **Scenario**

Request is made without sending authentication cookies.

### **Request**

    GET /api/notifications

### **Expected Status Code**

    401 Unauthorized

### **Expected Response**

```json
{
  "success": false,
  "message": "Access token missing"
}
```

***

# **4. Invalid or Expired Token**

## **Scenario**

JWT token is invalid, expired, or tampered with.

### **Expected Status Code**

    401 Unauthorized

### **Expected Response**

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

***

# **5. Invalid Pagination Parameters**

## **Scenario**

Negative page or invalid limit value.

### **Request**

    GET /api/notifications?page=-1&limit=20

### **Expected Status Code**

    400 Bad Request

### **Expected Response**

```json
{
  "success": false,
  "message": "Invalid pagination parameters"
}
```

***

# **6. Page Beyond Available Data**

## **Scenario**

User requests a page number greater than available total pages.

### **Request**

    GET /api/notifications?page=5&limit=10

*(Only 10 records exist → total\_pages = 1)*

### **Expected Response**

```json
{
  "success": true,
  "message": "Notifications fetched successfully for user ID: 35",
  "data": {
    "notifications": [],
    "pagination": {
      "page": 5,
      "limit": 10,
      "total": 10,
      "total_pages": 1,
      "has_next": false
    }
  }
}
```

***

# **7. Fetch Unread Notifications (If Supported)**

## **Scenario**

Retrieve only unread notifications.

### **Request**

    GET /api/notifications?is_read=0

### **Expected Behavior**

*   Only notifications where **is\_read = 0** are returned.
*   Pagination applies to the filtered results.

***

# **8. Mark Notification as Read (If Implemented)**

## **Endpoint**

    PATCH /api/notifications/:id/read

### **Example Request**

    PATCH /api/notifications/10/read

### **Expected Status Code**

    200 OK

### **Expected Response**

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### **Expected DB Update**

```sql
is_read = 1,
read_at = CURRENT_TIMESTAMP
```

***

# **Edge Case Test Matrix**

| Test Case                     | Expected Result                                    |
| ----------------------------- | -------------------------------------------------- |
| limit > 100                   | Validation error or enforce max limit              |
| page = 0                      | 400 Bad Request                                    |
| page > total\_pages           | Return empty notifications array                   |
| SQL injection attempt         | Sanitized input; must not crash DB                 |
| Accessing another user’s data | Must be denied; enforce token-based user isolation |

***

# **Pagination Calculation Reference**

```js
total_pages = Math.ceil(total / limit)
has_next = page < total_pages
offset = (page - 1) * limit
```

***

# **Recommended Validation Rules**

*   `page >= 1`
*   `limit >= 1`
*   `limit <= 100`
*   Authentication required
*   User ID MUST be derived from the token (not request body)

***
