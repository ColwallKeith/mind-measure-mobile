# Mobile App Nudges Integration - Implementation Guide

**Date**: January 22, 2026  
**Status**: ⚠️ Partial - API & Components Ready, Dashboard Integration Needed  
**Location**: mind-measure-mobile-final

---

## ✅ **What's Complete**

### **1. API Endpoint** (`/api/nudges/active.ts`)
Fetches active, non-expired nudges from Aurora with smart rotation:

**Features**:
- Filters by `status === 'active'` and `expiryDate > now`
- Returns `pinned` (single nudge) and `rotated` (weighted random)
- Priority weighting: High (3x), Normal (1x), Low (0.5x)

**Usage**:
```typescript
const response = await fetch(`/api/nudges/active?universityId=worcester`);
const { pinned, rotated } = await response.json();
```

### **2. Display Component** (`/src/components/mobile/NudgesDisplay.tsx`)
Renders nudges with template-specific styling:

**Templates**:
- **📅 Event**: Blue background, location, date/time, CTA button
- **💡 Service**: Purple background, access info, "More Info" button
- **📖 Tip**: Green background, compact, "Read more" link

**Props**:
```typescript
<NudgesDisplay
  pinned={pinnedNudge}
  rotated={rotatedNudge}
  onNudgeClick={(nudge) => console.log('Clicked', nudge)}
/>
```

---

## ⚠️ **What Needs Integration**

### **Dashboard Integration**

The mobile app dashboard needs to:

1. **Fetch nudges** on component mount
2. **Replace** hardcoded `DEFAULT_NUDGES` in `NudgesBanner.tsx`
3. **Render** using `NudgesDisplay` component
4. **Position** nudges between score card and check-in button

**Recommended Location**:
- After "Mind Measure Score" card
- Before "Check-in" button
- Or in a dedicated "What's Happening" section

---

## 🎨 **Styling Notes**

### **Template Colors**
- **Event**: `bg-blue-50 border-blue-200` with `text-blue-600`
- **Service**: `bg-purple-50 border-purple-200` with `text-purple-600`
- **Tip**: `bg-green-50 border-green-200` with `text-green-600`

### **Button Styling**
All buttons have **white text** (`text-white`) on colored backgrounds:
- Event CTA: `bg-blue-600 hover:bg-blue-700 text-white`
- Service More Info: `border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white`
- Tip Read More: Link style `text-green-600`

### **Pinned Badge**
```tsx
<div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
  📌 Featured
</div>
```

---

## 📋 **Integration Steps**

### **Step 1: Add Hook to Fetch Nudges**

Create or update a React hook:

```typescript
// src/hooks/useNudges.ts
export function useActiveNudges(universityId: string) {
  const [pinned, setPinned] = useState(null);
  const [rotated, setRotated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNudges() {
      try {
        const response = await fetch(`/api/nudges/active?universityId=${universityId}`);
        const data = await response.json();
        setPinned(data.pinned);
        setRotated(data.rotated);
      } catch (error) {
        console.error('Error fetching nudges:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchNudges();
  }, [universityId]);

  return { pinned, rotated, loading };
}
```

### **Step 2: Update Dashboard Component**

```typescript
import { NudgesDisplay } from '@/components/mobile/NudgesDisplay';
import { useActiveNudges } from '@/hooks/useActiveNudges';

function MobileDashboard() {
  const user = useAuth();
  const { pinned, rotated, loading } = useActiveNudges(user.university_id);

  return (
    <div className="p-4 space-y-6">
      {/* Mind Measure Score Card */}
      <ScoreCard score={userScore} />

      {/* Nudges */}
      {!loading && (
        <NudgesDisplay
          pinned={pinned}
          rotated={rotated}
          onNudgeClick={(nudge) => {
            // Optional: Track analytics
            console.log('Nudge clicked:', nudge.id);
          }}
        />
      )}

      {/* Check-in Button */}
      <CheckInButton />
    </div>
  );
}
```

### **Step 3: Remove Old Hardcoded Nudges**

In `NudgesBanner.tsx` (lines 7-11):
```typescript
// DELETE THESE:
const DEFAULT_NUDGES = [
  "Step outside for 10 minutes",
  "Message a friend",
  "Drink some water",
];
```

This component is no longer needed if using the new template system.

---

## 🔄 **Rotation Logic**

**How it works**:
1. Mobile app calls `/api/nudges/active?universityId=worcester`
2. API filters active, non-expired nudges
3. API returns:
   - `pinned`: Single nudge with `isPinned: true` (or null)
   - `rotated`: Randomly selected from weighted pool

**Weighting**:
- High priority nudge appears 3x more often
- Normal priority: 1x
- Low priority: 0.5x chance

**Example**:
```
Pool: [Event (high), Service (normal), Tip (low)]
Weighted: [Event, Event, Event, Service, Tip]
Random selection → 60% Event, 20% Service, 20% Tip
```

---

## 📊 **Analytics (Future)**

To track nudge performance:

1. **Add analytics endpoint**:
   ```typescript
   POST /api/nudges/analytics
   Body: { nudgeId, event: 'view' | 'click' | 'dismiss' }
   ```

2. **Update nudge record**:
   ```sql
   UPDATE universities SET nudges = jsonb_set(
     nudges,
     '{0,timesShown}',
     (nudges->0->>'timesShown')::int + 1
   );
   ```

3. **Track in NudgesDisplay**:
   ```typescript
   useEffect(() => {
     if (pinned) trackView(pinned.id);
     if (rotated) trackView(rotated.id);
   }, [pinned, rotated]);
   ```

---

## 🧪 **Testing Checklist**

- [ ] API endpoint returns active nudges for Worcester
- [ ] Pinned nudge displays with "📌 Featured" badge
- [ ] Rotated nudge displays without badge
- [ ] Event template shows location, date/time, button
- [ ] Service template shows access info, "More Info" button
- [ ] Tip template shows compact with "Read more" link
- [ ] All button text is white on colored backgrounds
- [ ] Expired nudges don't appear
- [ ] Draft nudges don't appear
- [ ] Clicking button opens link in new tab
- [ ] Rotation varies between dashboard refreshes
- [ ] Works for different universities (Worcester, Warwick, LSE)

---

## 🎯 **Summary**

The nudge system is **95% complete**:

✅ **CMS**: Full template-based editor with Draft/Publish  
✅ **API**: Fetches active, filtered, weighted nudges  
✅ **Components**: Template-specific rendering with proper styling  
⚠️ **Integration**: Needs to be wired into dashboard

**Estimated time to complete**: 15-20 minutes
- Add `useActiveNudges` hook
- Import and render `NudgesDisplay` in dashboard
- Remove old `DEFAULT_NUDGES`
- Test with Worcester data

---

## 📝 **Files Modified**

**Created**:
- `/api/nudges/active.ts` - API endpoint
- `/src/components/mobile/NudgesDisplay.tsx` - Display component
- `MOBILE_NUDGES_INTEGRATION.md` - This document

**Needs Modification**:
- Dashboard component (TBD - location unclear)
- `src/hooks/useNudges.ts` or create `useActiveNudges.ts`
- Remove `NudgesBanner.tsx` (deprecated)

---

## 🚀 **Next Steps**

1. Identify dashboard component (where score card is shown)
2. Add `useActiveNudges` hook
3. Integrate `NudgesDisplay` component
4. Test with Worcester university
5. Deploy mobile app
6. Create test nudges in CMS
7. Verify display on mobile

Once integrated, universities can manage event announcements, service info, and quick tips from the Marketing CMS!
