# Mind Measure: Multimodal Assessment Integration Plan
## Created: December 8, 2025

---

## Executive Summary

**Problem**: We lost ~5 days of work due to git corruption. Before that, we had attempted to integrate a multimodal Assessment Engine into both check-ins and baseline assessments, but the integration was incomplete and produced hallucinated results because the backend infrastructure was never built.

**Goal**: Properly integrate the 57-feature multimodal assessment pipeline (23 audio + 18 visual + 16 text) into Mind Measure's assessment flows.

**Approach**: Build the full stack from infrastructure through to UI, with proper testing at each layer, avoiding the mistakes that led to the hallucinated results.

---

## Part 1: What We Have vs. What We Need

### Current State (Post-Rollback)

✅ **Working:**
- Baseline assessments using ElevenLabs SDK
- Clinical scoring (PHQ-2 + GAD-2 + mood scale → composite 0-100 score)
- Database storage in `fusion_outputs` table
- Dashboard showing clinical scores
- Check-ins using ElevenLabs SDK (but NO multimodal processing)

❌ **Missing:**
- No audio feature extraction (23 features)
- No visual feature extraction (18 features)
- No text feature extraction (16 features)
- No multimodal fusion algorithm
- No personal baseline calibration
- No Assessment Engine backend infrastructure
- No S3 media storage
- No AWS Lambda functions for processing
- No Step Functions orchestration

### What We Had Before Corruption (Dec 3rd)

🟡 **Partially Built:**
- Mobile app code to capture audio/video during ElevenLabs conversation
- Mobile app code to call Assessment Engine APIs
- Mobile app code to upload media to S3
- Mobile app polling for multimodal results
- Animated processing screens

❌ **Never Built:**
- The actual Assessment Engine backend
- Feature extraction Lambdas
- Fusion algorithm implementation
- Database tables for multimodal features
- S3 upload endpoints
- Processing pipeline

**Result**: Mobile app was calling non-existent APIs and displaying hallucinated/mock scores.

---

## Part 2: The Fundamental Architecture Decision

We need to decide between two approaches:

### Option A: Full Multimodal Pipeline (Ambitious - 8-12 weeks)

Build the complete Assessment Engine as designed:
- AWS Lambda functions for 23 audio features
- AWS Rekognition for 18 visual features
- AWS Bedrock/Comprehend for 16 text features
- Personal baseline calibration per user
- Quality-weighted fusion algorithm
- Step Functions orchestration

**Pros:**
- Scientifically rigorous
- Personalized to each user's baseline
- Rich feature set for ML improvements
- True multimodal fusion

**Cons:**
- 8-12 weeks to build properly
- Significant AWS costs (~$0.10-0.50 per assessment)
- Complex infrastructure to maintain
- Requires data science validation

### Option B: Enhanced Clinical + Simple Multimodal (Pragmatic - 2-3 weeks)

Keep clinical scoring as primary, add lightweight multimodal augmentation:
- **Text**: Use existing transcript analysis (sentiment, themes, topics) - already working
- **Audio**: Basic prosody features from ElevenLabs metadata (pitch, energy, pace)
- **Visual**: Optional face detection confidence from browser MediaRecorder
- **Fusion**: Simple weighted average, not personalized

**Pros:**
- Can ship in 2-3 weeks
- Low infrastructure costs
- Builds on what's working
- Can evolve to Option A later

**Cons:**
- Less sophisticated than designed system
- Not personalized to user baseline
- Limited feature set

---

## Part 3: Recommended Approach (Hybrid)

### Phase 1: Enhanced Clinical with Text (Week 1-2)

**Keep baseline assessments exactly as they are** - clinical scoring works and is validated.

**Enhance check-ins** with text analysis only:
1. Capture transcript from ElevenLabs (already working)
2. Extract features from transcript:
   - Sentiment (positive/negative/neutral ratios)
   - Themes and topics (keywords extraction)
   - Language complexity (avg words per sentence, vocabulary diversity)
   - Emotional cues (worry words, energy words, sleep words)
3. Store in new `check_in_text_analysis` table
4. Compute simple deviation from baseline transcript patterns
5. Display as supplementary info on dashboard: "Themes: sleep, stress, relationships"

**Why this first:**
- No new AWS infrastructure needed
- Text processing can run in existing backend
- Low cost and low risk
- Provides immediate value

### Phase 2: Add Simple Audio Features (Week 3-4)

**Enhance check-ins** with basic audio analysis:
1. Use ElevenLabs conversation metadata (if available)
2. Or extract basic features client-side before upload:
   - Speaking rate (words per minute)
   - Pause frequency and duration
   - Voice energy/amplitude
3. Store in `check_in_audio_analysis` table
4. Compare to user's baseline check-in audio features
5. Flag significant deviations: "Speaking noticeably slower than usual"

**Infrastructure:**
- Option 1: Process in existing Node.js backend using `web-audio-api` libraries
- Option 2: Single Lambda function for basic audio processing
- Store raw audio in S3 for 30 days, then delete

### Phase 3: Establish Personal Baselines (Week 5-6)

**Add baseline capture to check-ins:**
1. After 3-5 check-ins, compute per-user baselines:
   - Average sentiment
   - Average speaking rate
   - Average pause duration
   - Typical themes/topics
2. Store in new `user_multimodal_baselines` table
3. Use these baselines to personalize deviation detection
4. Show in dashboard: "You seem more anxious than your usual baseline"

### Phase 4: Full Multimodal (Optional - Future)

If Phase 1-3 provide value and the business case is clear:
1. Build full 57-feature pipeline
2. Add visual analysis (facial affect)
3. Implement quality-weighted fusion
4. Migrate from simple deviation to sophisticated scoring

---

## Part 4: Detailed Implementation Plan (Phase 1)

### Step 1: Database Schema (1 day)

Create new tables:

```sql
-- Text analysis for check-ins
CREATE TABLE check_in_text_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_output_id UUID REFERENCES fusion_outputs(id),
  user_id UUID NOT NULL,
  
  -- Basic counts
  word_count INTEGER,
  sentence_count INTEGER,
  avg_words_per_sentence DECIMAL,
  
  -- Sentiment
  sentiment_positive DECIMAL, -- 0-1
  sentiment_negative DECIMAL, -- 0-1
  sentiment_neutral DECIMAL,  -- 0-1
  
  -- Emotional markers
  anxiety_words INTEGER,
  depression_words INTEGER,
  energy_words INTEGER,
  sleep_words INTEGER,
  
  -- Topics/themes (JSON array)
  themes JSONB,
  keywords JSONB,
  
  -- Metadata
  confidence DECIMAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User text baselines
CREATE TABLE user_text_baselines (
  user_id UUID PRIMARY KEY,
  baseline_data JSONB, -- { sentiment_avg: 0.6, anxiety_words_avg: 2.3, etc }
  sample_count INTEGER, -- how many check-ins contributed
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 2: Backend Text Analysis Service (2-3 days)

Create `/Users/keithduddy/Desktop/Mind Measure local/mind-measure-mobile-final/src/services/textAnalysis.ts`:

```typescript
interface TextFeatures {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotionalMarkers: {
    anxiety: number;
    depression: number;
    energy: number;
    sleep: number;
  };
  themes: string[];
  keywords: string[];
}

export async function analyzeTranscript(transcript: string): Promise<TextFeatures> {
  // Extract only user messages (not agent)
  const userMessages = transcript
    .split('\n')
    .filter(line => line.startsWith('user:'))
    .map(line => line.replace('user:', '').trim())
    .join(' ');
  
  // Basic counts
  const words = userMessages.split(/\s+/).filter(w => w.length > 0);
  const sentences = userMessages.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Sentiment (simple keyword-based for now)
  const positiveWords = ['good', 'great', 'happy', 'well', 'better', 'fine', 'ok'];
  const negativeWords = ['bad', 'worst', 'terrible', 'awful', 'difficult', 'hard', 'struggle'];
  
  const positiveCount = words.filter(w => 
    positiveWords.includes(w.toLowerCase())
  ).length;
  const negativeCount = words.filter(w => 
    negativeWords.includes(w.toLowerCase())
  ).length;
  
  // Emotional markers
  const anxietyWords = ['anxious', 'worried', 'nervous', 'stress', 'tense', 'panic'];
  const depressionWords = ['sad', 'depressed', 'down', 'hopeless', 'empty', 'numb'];
  const energyWords = ['tired', 'exhausted', 'fatigue', 'energy', 'drained'];
  const sleepWords = ['sleep', 'insomnia', 'wake', 'rest', 'bed'];
  
  // Theme extraction (simple for now)
  const themes: string[] = [];
  if (anxietyWords.some(w => userMessages.toLowerCase().includes(w))) themes.push('anxiety');
  if (depressionWords.some(w => userMessages.toLowerCase().includes(w))) themes.push('mood');
  if (sleepWords.some(w => userMessages.toLowerCase().includes(w))) themes.push('sleep');
  if (energyWords.some(w => userMessages.toLowerCase().includes(w))) themes.push('energy');
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: words.length / Math.max(sentences.length, 1),
    sentiment: {
      positive: positiveCount / Math.max(words.length, 1),
      negative: negativeCount / Math.max(words.length, 1),
      neutral: 1 - (positiveCount + negativeCount) / Math.max(words.length, 1)
    },
    emotionalMarkers: {
      anxiety: anxietyWords.filter(w => userMessages.toLowerCase().includes(w)).length,
      depression: depressionWords.filter(w => userMessages.toLowerCase().includes(w)).length,
      energy: energyWords.filter(w => userMessages.toLowerCase().includes(w)).length,
      sleep: sleepWords.filter(w => userMessages.toLowerCase().includes(w)).length
    },
    themes,
    keywords: [...new Set(words.filter(w => w.length > 5).slice(0, 10))]
  };
}
```

### Step 3: Integrate into Check-In Flow (2 days)

Modify `/Users/keithduddy/Desktop/Mind Measure local/mind-measure-mobile-final/src/components/mobile/CheckinAssessment.tsx`:

1. After check-in completes, analyze transcript
2. Save text features to database
3. Compare to user's baseline (if exists)
4. Display results on dashboard

### Step 4: Dashboard Enhancement (1-2 days)

Add text features to dashboard:
- "Recent Themes: sleep, stress, relationships"
- "Speaking style: [normal / more positive / more negative]"
- Trend chart showing sentiment over time

### Step 5: Testing (2 days)

1. Unit tests for text analysis
2. Integration tests for database storage
3. Manual testing of full check-in flow
4. Verify no regression in baseline assessments

---

## Part 5: Success Criteria

### Phase 1 Complete When:

✅ Check-ins capture and analyze transcript text
✅ Text features stored in database
✅ Dashboard shows themes and sentiment
✅ No breaking changes to baseline assessments
✅ Clinical scores still primary, text features supplementary
✅ All tests passing

### Ready for Phase 2 When:

✅ Phase 1 deployed and stable for 2+ weeks
✅ Users find text insights valuable
✅ Business case for audio analysis validated
✅ Infrastructure plan for audio processing approved

---

## Part 6: What We're NOT Doing (Yet)

### Deliberately Excluded from Phase 1:

❌ Audio feature extraction (23 features)
❌ Visual/facial analysis (18 features)
❌ Personal baseline calibration
❌ S3 media storage
❌ AWS Lambda infrastructure
❌ Multimodal fusion algorithm
❌ Quality weighting
❌ Step Functions orchestration

### Why:

These are complex, expensive, and unvalidated. We need to prove value with simple text analysis first before investing 8-12 weeks in the full pipeline.

---

## Part 7: Risk Mitigation

### How We Avoid Previous Mistakes:

1. **No Hallucination**: Text analysis runs locally or in existing backend, not calling non-existent APIs
2. **Incremental**: Each phase fully tested and deployed before next
3. **Clinical-First**: Keep clinical scores as primary source of truth
4. **Backward Compatible**: Baseline assessments unchanged
5. **Observable**: Comprehensive logging at each step
6. **Reversible**: Text features are additive, can be removed without breaking core functionality

### Rollback Plan:

If Phase 1 fails or provides no value:
- Remove `check_in_text_analysis` table
- Remove text analysis calls from check-in flow
- Dashboard reverts to clinical scores only
- Zero impact on baseline assessments

---

## Part 8: Timeline

### Phase 1: Text Analysis (2 weeks)
- Week 1: Database schema + text analysis service + integration
- Week 2: Dashboard enhancement + testing + deployment

### Phase 2: Audio Features (2 weeks)
- Week 3: Audio processing setup + basic feature extraction
- Week 4: Integration + baseline comparison + deployment

### Phase 3: Personal Baselines (2 weeks)
- Week 5: Baseline computation after N check-ins
- Week 6: Personalized deviation detection + dashboard updates

### Total: 6 weeks to sophisticated multimodal check-ins

---

## Part 9: Next Steps

**Immediate (this week):**
1. Review and approve this plan
2. Create database migration for text analysis tables
3. Build text analysis service
4. Write unit tests

**Following week:**
1. Integrate into check-in flow
2. Enhance dashboard
3. End-to-end testing
4. Deploy to production

**Future:**
If successful, evaluate Phase 2 (audio) and beyond.

---

## Appendix: Why The Previous Approach Failed

### What Went Wrong (Dec 1-3):

1. **Backend-First Mistake**: Started building mobile app integration before backend existed
2. **API Hallucination**: Mobile app called `/api/assessment-engine/*` endpoints that returned mock/invalid data
3. **No Validation**: Didn't verify that multimodal scores were real before displaying them
4. **Big Bang**: Tried to build entire 57-feature pipeline in one go
5. **Dual Integration**: Tried to retrofit baseline AND check-ins simultaneously
6. **Git Corruption**: Lost work due to large, tangled changes across many files

### How This Plan Avoids Those Issues:

1. **Backend-First**: Build text analysis service BEFORE integrating into UI
2. **Real Data**: No mock APIs, all processing is real and local
3. **Validation**: Each feature has unit tests proving it works
4. **Incremental**: Start with text (16 features), then add audio (23), then visual (18)
5. **Single Integration**: Check-ins only, baseline stays clinical-only
6. **Small Commits**: One table, one service, one integration point at a time

---

**Document Status**: Draft for review
**Author**: AI Assistant
**Date**: December 8, 2025
**Next Review**: After stakeholder approval









