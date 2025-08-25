# Validate Points Award Edge Function

## Purpose
This Edge Function validates points awards to prevent future inflation and ensure data integrity. It was created in response to the critical bug that caused users to accumulate 2+ million points due to infinite data saving loops.

## Features
- **Points Validation**: Ensures points are between 1 and 1000
- **Daily Limits**: Enforces maximum 1000 points per day
- **Duplicate Prevention**: Prevents the same action from being rewarded multiple times per day
- **Server-side Security**: All validation happens on the server to prevent client-side manipulation

## Usage
Call this function before awarding points to validate the award:

```typescript
const { data, error } = await supabase.functions.invoke('validate-points-award', {
  body: {
    userId: 'user-uuid',
    points: 100,
    reason: 'Daily air quality reading',
    action: 'air_quality_reading'
  }
});

if (data?.success) {
  // Proceed with awarding points
  await awardPoints(userId, points, reason, action);
} else {
  // Handle validation error
  console.error('Points validation failed:', error);
}
```

## Parameters
- `userId`: The user's UUID
- `points`: Number of points to award (1-1000)
- `reason`: Description of why points are being awarded
- `action`: The specific action being rewarded

## Response
- **Success**: Returns validation success with daily total
- **Error**: Returns specific error message and details

## Security
- Uses service role key for database access
- Validates all inputs server-side
- Prevents duplicate awards and excessive points
- Enforces daily limits to prevent abuse
