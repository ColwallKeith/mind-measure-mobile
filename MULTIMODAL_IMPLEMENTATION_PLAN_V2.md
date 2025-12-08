# Mind Measure: Multimodal Assessment Implementation Plan
## Version 2 - Corrected Architecture
## Created: December 8, 2025

---

## Executive Summary

**Architecture:**
- **Baseline**: 70% clinical (PHQ-2/GAD-2/mood) + 30% multimodal (audio/visual) → establishes personal reference
- **Check-ins**: 100% multimodal (57 features) → detects deviations from baseline

**Timeline**: 6-8 weeks for full implementation

---

## Part 1: The Correct Architecture

### Baseline Assessment
**Purpose**: Establish personal reference profile  
**Scoring**: 70% clinical + 30% multimodal

**Clinical Component (70%)**:
- PHQ-2 (depression screening)
- GAD-2 (anxiety screening)  
- Mood scale (1-10)
- Already working ✅

**Multimodal Component (30%)**:
- **Audio Features (15%)**: ~10 basic prosody features
  - Mean pitch (F0)
  - Pitch variability
  - Speaking rate (words per minute)
  - Pause frequency
  - Pause duration
  - Voice energy/amplitude
  - Jitter (voice stability)
  - Shimmer (voice quality)
  
- **Visual Features (15%)**: ~10 basic facial affect features
  - Smile frequency
  - Smile intensity
  - Eye contact/gaze
  - Eyebrow position (stress indicator)
  - Facial tension
  - Blink rate (fatigue)
  - Head movement
  - Overall affect (positive/neutral/negative)

**Storage**: All features stored in `user_baselines` table for future comparison

---

### Check-In Assessment
**Purpose**: Detect changes from personal baseline  
**Scoring**: 100% multimodal deviation

**Full Feature Pipeline (57 features)**:

**Audio Features (23)**:
1. Mean F0 (pitch)
2. F0 standard deviation
3. F0 range
4. Jitter (local)
5. Jitter (rap)
6. Shimmer (local)
7. Shimmer (apq3)
8. Harmonic-to-noise ratio (HNR)
9. Speaking rate
10. Articulation rate
11. Pause count
12. Mean pause duration
13. Pause ratio (% of time silent)
14. Mean intensity
15. Intensity variability
16. Spectral centroid
17. Spectral rolloff
18. Voice quality (breathiness)
19. Formant F1 mean
20. Formant F2 mean
21. MFCC variance (voice texture)
22. Voice onset time
23. Prosody variability

**Visual Features (18)**:
1. Smile duration (% of time)
2. Smile intensity (average)
3. Smile authenticity (Duchenne vs social)
4. Frown frequency
5. Eyebrow raise frequency (surprise/concern)
6. Eyebrow furrow frequency (concentration/stress)
7. Eye contact ratio
8. Gaze aversion frequency
9. Blink rate
10. Pupil dilation (if detectable)
11. Head nod frequency (engagement)
12. Head shake frequency
13. Head tilt variance
14. Facial tension (jaw/forehead)
15. Mouth movements (lip biting, etc)
16. Overall facial affect score
17. Affect variability (emotional lability)
18. Face presence quality (% of time face detected)

**Text Features (16)**:
1. Word count
2. Sentence count
3. Words per sentence (complexity)
4. Sentiment positive ratio
5. Sentiment negative ratio
6. Sentiment neutral ratio
7. First-person pronoun usage (self-focus)
8. Negative emotion words
9. Positive emotion words
10. Anxiety-related words
11. Depression-related words
12. Sleep-related words
13. Social words
14. Cognitive process words (thinking, understanding)
15. Linguistic complexity (unique words / total words)
16. Response latency (time to respond to prompts)

**Fusion Algorithm**:
```
For each feature:
  z_score = (current_value - baseline_mean) / baseline_stddev
  
Modality scores:
  audio_score = mean(z_scores for 23 audio features)
  visual_score = mean(z_scores for 18 visual features)
  text_score = mean(z_scores for 16 text features)
  
Quality weighting:
  audio_weight = audio_quality * 0.33
  visual_weight = visual_quality * 0.33
  text_weight = text_quality * 0.33
  
Fused deviation:
  deviation = (audio_score * audio_weight + 
               visual_score * visual_weight + 
               text_score * text_weight) / 
              (audio_weight + visual_weight + text_weight)
              
Mind Measure Score:
  score = 50 + (deviation * 15)  // Maps -3σ to +3σ onto 0-100 scale
  score = clamp(score, 0, 100)
```

---

## Part 2: Implementation Phases

### Phase 1: Baseline Multimodal Capture (Week 1-2)

**Goal**: Add audio/visual capture to existing baseline assessment, compute 30% multimodal component

**Tasks**:

1. **Media Capture During Baseline** (2 days)
   - Modify `BaselineAssessmentSDK.tsx`
   - Request camera + microphone permissions
   - Start MediaRecorder when ElevenLabs conversation begins
   - Capture audio stream
   - Capture video frames (1 fps) during conversation
   - Store in memory (don't upload yet)

2. **Basic Audio Feature Extraction** (2 days)
   - Create `src/services/audioFeatures.ts`
   - Extract 10 baseline audio features using Web Audio API:
     ```typescript
     interface BaselineAudioFeatures {
       meanPitch: number;
       pitchVariability: number;
       speakingRate: number;
       pauseFrequency: number;
       pauseDuration: number;
       voiceEnergy: number;
       jitter: number;
       shimmer: number;
       harmonic: number;
       quality: number; // 0-1
     }
     ```
   - Process locally in browser (no backend needed yet)

3. **Basic Visual Feature Extraction** (2 days)
   - Create `src/services/visualFeatures.ts`
   - Use simple face detection library (e.g., `face-api.js`)
   - Extract 10 baseline visual features:
     ```typescript
     interface BaselineVisualFeatures {
       smileFrequency: number;
       smileIntensity: number;
       eyeContact: number;
       eyebrowPosition: number;
       facialTension: number;
       blinkRate: number;
       headMovement: number;
       affect: number; // -1 to 1 (negative to positive)
       facePresenceQuality: number; // 0-1
       overallQuality: number; // 0-1
     }
     ```

4. **Baseline Scoring Update** (2 days)
   - Compute clinical score (already working): `clinicalScore = 0-100`
   - Compute multimodal component:
     ```typescript
     // Normalize each feature to 0-100 scale
     const audioScore = normalizeAudioFeatures(audioFeatures);
     const visualScore = normalizeVisualFeatures(visualFeatures);
     const multimodalScore = (audioScore + visualScore) / 2;
     
     // Final baseline score: 70% clinical + 30% multimodal
     const finalScore = (clinicalScore * 0.7) + (multimodalScore * 0.3);
     ```

5. **Database Schema** (1 day)
   ```sql
   -- Add to existing fusion_outputs table
   ALTER TABLE fusion_outputs ADD COLUMN audio_features JSONB;
   ALTER TABLE fusion_outputs ADD COLUMN visual_features JSONB;
   ALTER TABLE fusion_outputs ADD COLUMN multimodal_component DECIMAL;
   ALTER TABLE fusion_outputs ADD COLUMN scoring_breakdown JSONB;
   
   -- Scoring breakdown structure:
   -- {
   --   "clinical_score": 82,
   --   "clinical_weight": 0.7,
   --   "multimodal_score": 75,
   --   "multimodal_weight": 0.3,
   --   "final_score": 79.9
   -- }
   ```

6. **Storage** (1 day)
   - Save baseline audio/visual features to `fusion_outputs.audio_features` and `fusion_outputs.visual_features`
   - Save scoring breakdown to `fusion_outputs.scoring_breakdown`
   - Update analysis JSON to include multimodal components

7. **Testing** (2 days)
   - Unit tests for feature extraction
   - Integration test for full baseline flow
   - Verify 70/30 scoring calculation
   - Ensure backward compatibility (existing baselines still work)

**Deliverables**:
- ✅ Baseline captures audio/video during conversation
- ✅ Extracts 10 audio + 10 visual features
- ✅ Computes 70% clinical + 30% multimodal score
- ✅ Stores features for future check-in comparisons
- ✅ No breaking changes to existing functionality

---

### Phase 2: Check-In Full Feature Extraction (Week 3-5)

**Goal**: Implement full 57-feature extraction for check-ins

**Tasks**:

1. **Infrastructure Setup** (3 days)
   - Set up S3 bucket for media storage
   - Create Lambda function for audio processing (23 features)
   - Create Lambda function for visual processing (18 features)
   - Create Lambda function for text processing (16 features)
   - Set up API Gateway endpoints

2. **Audio Feature Extraction - Full Pipeline** (4 days)
   - Implement all 23 audio features in Lambda
   - Use Python + librosa/parselmouth for advanced features
   - Test with sample audio files
   - Validate against known baselines

3. **Visual Feature Extraction - Full Pipeline** (3 days)
   - Implement all 18 visual features
   - Use AWS Rekognition for face detection
   - Custom logic for affect and engagement metrics
   - Test with sample video frames

4. **Text Feature Extraction - Full Pipeline** (3 days)
   - Implement all 16 text features
   - Use AWS Comprehend for sentiment
   - Use AWS Bedrock (Claude) for complex linguistic analysis
   - Test with sample transcripts

5. **Check-In Media Upload Flow** (2 days)
   - Modify `CheckinAssessment.tsx`
   - Capture audio/video during conversation
   - Upload to S3 on completion
   - Call Lambda functions for processing
   - Poll for results

**Deliverables**:
- ✅ Full 57-feature extraction working
- ✅ AWS infrastructure deployed
- ✅ Check-in uploads media and gets features back

---

### Phase 3: Baseline Comparison & Fusion (Week 6-7)

**Goal**: Compare check-in features to baseline, compute deviation scores

**Tasks**:

1. **User Baseline Storage** (2 days)
   ```sql
   CREATE TABLE user_multimodal_baselines (
     user_id UUID PRIMARY KEY,
     baseline_fusion_output_id UUID REFERENCES fusion_outputs(id),
     
     -- Audio baselines (mean and stddev for each feature)
     audio_baselines JSONB, -- {"meanPitch": {"mu": 150, "sigma": 20}, ...}
     
     -- Visual baselines
     visual_baselines JSONB, -- {"smileFrequency": {"mu": 0.3, "sigma": 0.1}, ...}
     
     -- Text baselines (computed after 3+ check-ins)
     text_baselines JSONB,
     
     -- Metadata
     check_in_count INTEGER DEFAULT 0,
     last_updated_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Baseline Computation** (2 days)
   - After first baseline, initialize with baseline features
   - After each check-in, update running mean/stddev
   - Use exponential moving average for adaptation:
     ```typescript
     // After N check-ins, baseline adapts slowly
     alpha = 0.1; // adaptation rate
     new_mean = (1 - alpha) * old_mean + alpha * current_value;
     ```

3. **Fusion Lambda** (3 days)
   - Receive all 57 features from check-in
   - Retrieve user's baseline from database
   - Compute z-scores for each feature
   - Apply quality weighting
   - Compute modality scores
   - Compute fused Mind Measure score
   - Generate risk indicators

4. **Risk Detection** (2 days)
   ```typescript
   interface RiskAssessment {
     level: 'none' | 'mild' | 'moderate' | 'high';
     reasons: string[]; // e.g., ["significant drop in voice energy", "increased negative sentiment"]
     contributingFactors: Array<{
       modality: 'audio' | 'visual' | 'text';
       feature: string;
       deviation: number; // how many σ from baseline
       impact: number; // 0-1
     }>;
   }
   ```

**Deliverables**:
- ✅ User baselines computed and stored
- ✅ Check-ins compared to personal baseline
- ✅ Deviation scores calculated
- ✅ Risk levels assigned

---

### Phase 4: Step Functions Orchestration (Week 8)

**Goal**: Reliable, scalable processing pipeline

**Tasks**:

1. **State Machine Design** (2 days)
   ```
   Start Check-In
     ↓
   Parallel:
     - Audio Analysis Lambda
     - Visual Analysis Lambda  
     - Text Analysis Lambda
     ↓
   Wait for All
     ↓
   Fusion Lambda
     ↓
   Update Baseline Lambda (if needed)
     ↓
   Mark Complete Lambda
   ```

2. **Error Handling** (2 days)
   - Retry failed feature extraction (2x)
   - Graceful degradation if one modality fails
   - Adjust quality weights if missing data
   - Alert monitoring if failures > 5%

3. **Testing & Monitoring** (2 days)
   - End-to-end integration tests
   - Load testing (100 concurrent check-ins)
   - CloudWatch dashboards
   - Alarms for failures

**Deliverables**:
- ✅ Robust processing pipeline
- ✅ Handles failures gracefully
- ✅ Observable and monitorable

---

## Part 3: Updated Mobile App Flow

### Baseline Flow (Updated)

```
BaselineWelcome
  ↓
BaselineAssessmentSDK
  ↓
Request camera + mic permissions
  ↓
Start ElevenLabs conversation + media capture
  ↓
User answers 5 questions
  ↓
Press "Finish"
  ↓
[PROCESSING SCREEN - animated, 10-15 seconds]
  ↓
Extract clinical responses (PHQ-2, GAD-2, mood)
Extract audio features (10 features)
Extract visual features (10 features)
  ↓
Compute scores:
  - Clinical: 82/100
  - Audio: 75/100
  - Visual: 78/100
  - Final: (82 * 0.7) + ((75+78)/2 * 0.3) = 80.35/100
  ↓
Save to database:
  - fusion_outputs (with multimodal data)
  - assessment_transcripts
  - assessment_items
  - user_multimodal_baselines (initialized)
  ↓
Mark profile.baseline_established = true
  ↓
Navigate to Dashboard
```

### Check-In Flow (New)

```
Dashboard → "Daily Check-In"
  ↓
CheckInWelcome
  ↓
CheckinAssessment (ElevenLabs SDK)
  ↓
Request camera + mic permissions
  ↓
Start ElevenLabs conversation + media recording
  ↓
Casual conversation (2-3 minutes)
  ↓
Press "Finish"
  ↓
[PROCESSING SCREEN - animated, 60-90 seconds]
Phase 1: "Analyzing Voice Patterns" (0-20s)
Phase 2: "Examining Facial Expressions" (20-40s)  
Phase 3: "Calculating Your Score" (40-60s)
  ↓
Upload audio to S3
Upload video frames to S3
  ↓
Trigger Step Functions:
  - Audio Lambda (23 features)
  - Visual Lambda (18 features)
  - Text Lambda (16 features)
  ↓
Fusion Lambda:
  - Retrieve user baseline
  - Compute z-scores
  - Apply quality weighting
  - Calculate Mind Measure score
  - Detect risk level
  ↓
Poll for completion
  ↓
Display result:
  - Score: 65/100 (worse than baseline)
  - "You seem more stressed than usual"
  - Themes: work, sleep, relationships
  ↓
Save to database:
  - fusion_outputs
  - check_in_text_analysis
  - check_in_audio_analysis
  - check_in_visual_analysis
  ↓
Update user baseline (running average)
  ↓
Navigate to Dashboard (updated with new data point)
```

---

## Part 4: Database Schema (Complete)

```sql
-- Existing table (enhanced)
ALTER TABLE fusion_outputs ADD COLUMN IF NOT EXISTS audio_features JSONB;
ALTER TABLE fusion_outputs ADD COLUMN IF NOT EXISTS visual_features JSONB;
ALTER TABLE fusion_outputs ADD COLUMN IF NOT EXISTS text_features JSONB;
ALTER TABLE fusion_outputs ADD COLUMN IF NOT EXISTS multimodal_component DECIMAL;
ALTER TABLE fusion_outputs ADD COLUMN IF NOT EXISTS scoring_breakdown JSONB;

-- User baselines (new)
CREATE TABLE user_multimodal_baselines (
  user_id UUID PRIMARY KEY,
  baseline_fusion_output_id UUID REFERENCES fusion_outputs(id),
  
  audio_baselines JSONB,
  visual_baselines JSONB,
  text_baselines JSONB,
  
  check_in_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-in analysis tables (new)
CREATE TABLE check_in_audio_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_output_id UUID REFERENCES fusion_outputs(id),
  user_id UUID NOT NULL,
  
  -- 23 audio features as columns
  mean_f0 DECIMAL,
  f0_std DECIMAL,
  f0_range DECIMAL,
  jitter_local DECIMAL,
  jitter_rap DECIMAL,
  shimmer_local DECIMAL,
  shimmer_apq3 DECIMAL,
  hnr DECIMAL,
  speaking_rate DECIMAL,
  articulation_rate DECIMAL,
  pause_count INTEGER,
  mean_pause_duration DECIMAL,
  pause_ratio DECIMAL,
  mean_intensity DECIMAL,
  intensity_std DECIMAL,
  spectral_centroid DECIMAL,
  spectral_rolloff DECIMAL,
  voice_quality DECIMAL,
  formant_f1 DECIMAL,
  formant_f2 DECIMAL,
  mfcc_variance DECIMAL,
  voice_onset_time DECIMAL,
  prosody_variability DECIMAL,
  
  -- Metadata
  signal_quality DECIMAL,
  features_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE check_in_visual_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_output_id UUID REFERENCES fusion_outputs(id),
  user_id UUID NOT NULL,
  
  -- 18 visual features as columns
  smile_duration DECIMAL,
  smile_intensity DECIMAL,
  smile_authenticity DECIMAL,
  frown_frequency DECIMAL,
  eyebrow_raise_freq DECIMAL,
  eyebrow_furrow_freq DECIMAL,
  eye_contact_ratio DECIMAL,
  gaze_aversion_freq DECIMAL,
  blink_rate DECIMAL,
  pupil_dilation DECIMAL,
  head_nod_freq DECIMAL,
  head_shake_freq DECIMAL,
  head_tilt_variance DECIMAL,
  facial_tension DECIMAL,
  mouth_movements DECIMAL,
  overall_affect DECIMAL,
  affect_variability DECIMAL,
  face_presence_quality DECIMAL,
  
  -- Metadata
  features_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE check_in_text_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fusion_output_id UUID REFERENCES fusion_outputs(id),
  user_id UUID NOT NULL,
  
  -- 16 text features as columns
  word_count INTEGER,
  sentence_count INTEGER,
  words_per_sentence DECIMAL,
  sentiment_positive DECIMAL,
  sentiment_negative DECIMAL,
  sentiment_neutral DECIMAL,
  first_person_ratio DECIMAL,
  negative_emotion_words INTEGER,
  positive_emotion_words INTEGER,
  anxiety_words INTEGER,
  depression_words INTEGER,
  sleep_words INTEGER,
  social_words INTEGER,
  cognitive_words INTEGER,
  linguistic_complexity DECIMAL,
  response_latency DECIMAL,
  
  -- Extracted themes/keywords
  themes JSONB,
  keywords JSONB,
  
  -- Metadata
  transcript_quality DECIMAL,
  features_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_baselines_user ON user_multimodal_baselines(user_id);
CREATE INDEX idx_audio_analysis_fusion ON check_in_audio_analysis(fusion_output_id);
CREATE INDEX idx_visual_analysis_fusion ON check_in_visual_analysis(fusion_output_id);
CREATE INDEX idx_text_analysis_fusion ON check_in_text_analysis(fusion_output_id);
```

---

## Part 5: Success Criteria

### Phase 1 Complete When:
✅ Baseline captures audio + video  
✅ Extracts 10 audio + 10 visual features  
✅ Computes 70% clinical + 30% multimodal score  
✅ Stores baseline features in database  
✅ No regression in existing baseline flow  
✅ All tests passing  

### Phase 2 Complete When:
✅ Check-in uploads audio/video to S3  
✅ Lambda functions extract all 57 features  
✅ Features stored in analysis tables  
✅ Processing completes in < 2 minutes  

### Phase 3 Complete When:
✅ Check-in features compared to baseline  
✅ Z-scores computed correctly  
✅ Fused score matches spec  
✅ Risk detection working  

### Phase 4 Complete When:
✅ Step Functions orchestrates full pipeline  
✅ Handles 100+ concurrent check-ins  
✅ Graceful degradation on failures  
✅ Monitoring dashboards operational  

---

## Part 6: Timeline & Resources

**Total Duration**: 8 weeks

**Week 1-2**: Baseline multimodal (Phase 1)  
**Week 3-5**: Check-in feature extraction (Phase 2)  
**Week 6-7**: Fusion & baseline comparison (Phase 3)  
**Week 8**: Orchestration & testing (Phase 4)

**Resources Needed**:
- 1 full-time developer (me/AI)
- AWS account with permissions for Lambda, S3, Rekognition, Comprehend, Bedrock
- Database access for schema changes
- Testing with real users (week 8)

---

## Part 7: Risk Mitigation

### Technical Risks:
1. **Browser-based feature extraction slow** → Use Web Workers for parallel processing
2. **AWS costs higher than expected** → Implement sampling (process 1 frame/sec instead of all frames)
3. **Feature extraction accuracy low** → Validate against ground truth data, adjust algorithms
4. **Baseline drift over time** → Implement adaptive baseline with decay

### Product Risks:
1. **Users uncomfortable with video** → Make video optional, degrade gracefully
2. **Multimodal doesn't improve accuracy** → A/B test against clinical-only
3. **Processing too slow** → Optimize Lambda cold starts, pre-warm instances

### Rollback Plan:
- Phase 1: Can disable multimodal component, revert to 100% clinical scoring
- Phase 2-4: Feature flag to disable check-in multimodal processing
- Database migrations are additive (new columns/tables), can be ignored if unused

---

**Status**: Ready to implement  
**Next Step**: Start Phase 1 - Baseline audio/visual capture  
**Approval Required**: Yes

---

