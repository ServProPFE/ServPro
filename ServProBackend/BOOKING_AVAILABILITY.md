# Booking Availability System

## Overview

The booking system now includes **availability validation** to ensure that bookings can only be created for times when the provider is actually available.

## How It Works

### 1. Provider Availability Setup

Providers define their availability using the Availability model:
- **day**: Day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
- **start**: Start time in HH:mm format (e.g., "08:00")
- **end**: End time in HH:mm format (e.g., "17:00")
- **provider**: The provider's user ID

### 2. Creating a Booking

When a client creates a booking via `POST /bookings`, the system:

1. **Validates the expectedAt field**
   - Checks that the date/time is provided
   - Validates the date/time format

2. **Checks Provider Availability**
   - Extracts the day of week from the requested booking date
   - Extracts the time from the requested booking time
   - Queries the Availability collection for matching provider + day combination
   - Validates that the requested time falls within start and end times

3. **Creates or Rejects the Booking**
   - ✅ If available: Booking is created normally
   - ❌ If not available: Returns a 409 Conflict error with details about available times

## API Endpoints

### Check Available Time Slots
```
GET /availability/slots/available?providerId=<id>&date=<YYYY-MM-DD>
```

**Query Parameters:**
- `providerId` (required): The provider's user ID
- `date` (required): The date to check (YYYY-MM-DD or ISO 8601 format)

**Response:**
```json
{
  "date": "2024-05-20",
  "providerId": "507f1f77bcf86cd799439011",
  "dayOfWeek": 1,
  "dayName": "Monday",
  "available": true,
  "startTime": "08:00",
  "endTime": "17:00",
  "availabilityId": "507f1f77bcf86cd799439012"
}
```

### Create Booking (with Availability Validation)
```
POST /bookings
```

**Request Body:**
```json
{
  "client": "507f1f77bcf86cd799439011",
  "provider": "507f1f77bcf86cd799439012",
  "service": "507f1f77bcf86cd799439013",
  "expectedAt": "2024-05-20T10:30:00",
  "status": "PENDING",
  "detail": "507f1f77bcf86cd799439014"
}
```

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439015",
  "client": "507f1f77bcf86cd799439011",
  "provider": "507f1f77bcf86cd799439012",
  "service": "507f1f77bcf86cd799439013",
  "status": "PENDING",
  "expectedAt": "2024-05-20T10:30:00",
  "totalPrice": 75,
  "currency": "TND",
  "createdAt": "2024-05-15T14:22:00Z"
}
```

**Error Response (409)** - Availability Conflict:
```json
{
  "message": "Provider is available on Monday from 08:00 to 17:00, but requested time is 19:30"
}
```

## Utility Functions

The system provides reusable utility functions in `src/utils/availabilityHelper.js`:

### checkProviderAvailability(providerId, expectedAt)
Validates if a provider is available at a specific date/time.

```javascript
const { checkProviderAvailability } = require("../utils/availabilityHelper");

const result = await checkProviderAvailability(providerId, "2024-05-20T10:30:00");
if (result.available) {
  console.log("Provider is available!");
} else {
  console.log(result.message);
}
```

### getProviderAvailabilityForDay(providerId, dayOfWeek)
Get availability for a specific day of the week.

```javascript
const { getProviderAvailabilityForDay } = require("../utils/availabilityHelper");

const availability = await getProviderAvailabilityForDay(providerId, 1); // Monday
```

### getProviderAllAvailabilities(providerId)
Get all availability slots for a provider.

```javascript
const { getProviderAllAvailabilities } = require("../utils/availabilityHelper");

const allAvailabilities = await getProviderAllAvailabilities(providerId);
// Returns array with dayName, startTime, endTime for each day
```

## Error Handling

### Availability Not Found
```
Status: 409 Conflict
Message: "Provider is not available on Monday"
```

### Time Outside Available Range
```
Status: 409 Conflict
Message: "Provider is available on Monday from 08:00 to 17:00, but requested time is 19:30"
```

### Invalid Date/Time Format
```
Status: 400 Bad Request
Message: "expectedAt must be a valid date/time"
```

## Frontend Integration

When building the frontend booking form:

1. **Fetch provider availability:**
   ```javascript
   const response = await fetch(
     `/availability/slots/available?providerId=${providerId}&date=${selectedDate}`
   );
   const availabilityData = await response.json();
   ```

2. **Display available time range:**
   - Show the provider's available hours for the selected date
   - Disable time picker outside these hours

3. **Handle booking creation:**
   - Validate the selected time is within available range
   - Show user-friendly error messages if availability check fails

## Database Notes

The Availability collection stores the provider's working schedule. The system uses:
- Day of week comparison (0-6)
- Time string comparison using HH:mm format (lexicographic ordering works for time comparison)

For example:
- "10:30" >= "08:00" and "10:30" <= "17:00" ✅ Available
- "19:30" >= "08:00" but "19:30" > "17:00" ❌ Not available

## Testing the System

**Test Availability Check:**
```bash
curl -X GET "http://localhost:4000/availability/slots/available?providerId=<id>&date=2024-05-20"
```

**Test Booking Creation:**
```bash
curl -X POST "http://localhost:4000/bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "client": "<clientId>",
    "provider": "<providerId>",
    "service": "<serviceId>",
    "expectedAt": "2024-05-20T10:30:00",
    "status": "PENDING",
    "detail": "<detailId>"
  }'
```
