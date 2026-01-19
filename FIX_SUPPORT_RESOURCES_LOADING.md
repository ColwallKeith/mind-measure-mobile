# Fix: Support Resources Not Loading in Mobile App

**Date**: 2026-01-19  
**Repository**: `mind-measure-mobile-final`  
**Status**: ✅ Fixed (NOT DEPLOYED YET)

---

## Problem

Support resources added in the admin CMS were not showing up in the mobile app. Users saw hardcoded placeholder resources instead of their university's actual resources.

### Root Causes

1. **MobileProfile.tsx** - Hardcoded to always load "University of Worcester" by name instead of using user's actual `university_id`
2. **HelpPage.tsx** - Not filtering national resources by `isEnabled` flag
3. **User profiles** - Some users have incorrect `university_id` in database (e.g., "lse" instead of "worcester")

---

## Fixes Applied

### Fix #1: MobileProfile.tsx (Line 136-139)

**Before**:
```typescript
// Fetch university data (default to Worcester for now)
const universityResponse = await backendService.database.select('universities', {
  filters: { name: 'University of Worcester' }
});
```

**After**:
```typescript
// Fetch university data using the user's actual university_id
const universityResponse = await backendService.database.select('universities', {
  filters: { id: profile.university_id }
});
```

**Result**: Profile now correctly loads the user's assigned university instead of hardcoding Worcester.

---

### Fix #2: HelpPage.tsx (Line 161-179)

**Before**:
```typescript
// Map national resources from CMS
if (university.national_resources && Array.isArray(university.national_resources)) {
  const nationalMapped = university.national_resources.map((resource: any) => ({
    name: resource.name || '',
    description: resource.description || '',
    phone: resource.phones?.[0] || resource.phone || '',
    website: resource.website || ''
  }));
  // ... rest
```

**After**:
```typescript
// Map national resources from CMS (only show enabled ones)
if (university.national_resources && Array.isArray(university.national_resources)) {
  // Filter for enabled resources only
  const enabledResources = university.national_resources.filter((resource: any) => 
    resource.isEnabled !== false  // Show if isEnabled is true or undefined
  );
  
  const nationalMapped = enabledResources.map((resource: any) => ({
    name: resource.name || '',
    description: resource.description || '',
    phone: resource.phones?.[0] || resource.phone || '',
    website: resource.website || ''
  }));
  // ... rest
```

**Result**: Only enabled national resources are shown to users. Admins can disable resources in the CMS.

---

## Database Update Required

**IMPORTANT**: User profiles with incorrect `university_id` need to be fixed.

### SQL to Update User Profiles

```sql
-- Update all users who should be Worcester but are assigned to LSE
UPDATE profiles 
SET university_id = 'worcester', 
    updated_at = NOW()
WHERE university_id = 'lse';

-- Or for specific user (Keith's account):
UPDATE profiles 
SET university_id = 'worcester',
    updated_at = NOW()
WHERE email = 'keith@mindmeasure.co.uk';
```

**Note**: LSE is dummy data with no real users. All current users should be Worcester.

---

## How It Works Now

### Admin CMS Flow:
1. University admin goes to CMS → Support tab
2. Adds/edits emergency contacts, local resources, national resources
3. For national resources, can enable/disable with toggle
4. Clicks "Save All Changes"
5. Data saved to `universities` table with columns:
   - `emergency_contacts` (array)
   - `mental_health_services` (array)
   - `local_resources` (array)
   - `national_resources` (array with `isEnabled` flags)

### Mobile App Flow:
1. User opens Help/Support in mobile app
2. App loads user's profile → gets `university_id`
3. App loads university data using `university_id`
4. **Emergency contacts**: Shows all from `emergency_contacts` array
5. **Local resources**: Shows all from `local_resources` array  
6. **National resources**: Shows only where `isEnabled !== false`
7. If no CMS data, falls back to hardcoded defaults

---

## Testing Checklist

After deployment:

- [ ] User's profile loads correct university name
- [ ] Emergency contact (e.g., University Security) shows up
- [ ] National resources show 10 enabled items (not hardcoded 5)
- [ ] Disabled national resources don't appear
- [ ] Profile page shows correct university
- [ ] Support page loads university-specific resources

---

## Files Changed

- ✅ `src/components/mobile/MobileProfile.tsx` - Line 136-139
- ✅ `src/components/mobile/HelpPage.tsx` - Line 161-179

**Database update needed**: Run SQL to fix `university_id` in profiles table.

---

**Status**: Code fixed locally, ready for deployment + database update
