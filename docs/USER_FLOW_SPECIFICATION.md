# Mind Measure User Flow Specification

## Complete User Journey Documentation

This document defines the exact user flow for the Mind Measure mobile application, including authentication states, screen transitions, and data requirements.

## 📱 New User Flow

### 1. New User Splash Screen
- **Trigger**: First-time app open, no existing account
- **Content**: Welcome message, app introduction, feature highlights
- **Action**: "Get Started" button
- **Next**: Registration/Authentication

### 2. Authentication (Registration)
- **Trigger**: User clicks "Get Started" from splash
- **Content**: 3-step registration process (name, email/password, consent)
- **Data Collected**: 
  - Personal info (first name, last name, email)
  - Account credentials (email, password)
  - Privacy consent and data processing permissions
- **Backend**: Creates Supabase user account and profile
- **Next**: Baseline Welcome Screen

### 3. Baseline Welcome Screen
- **Trigger**: Successful registration/authentication
- **Content**: Introduction to baseline assessment process
- **Purpose**: Explain what the baseline assessment is and why it's important
- **Action**: "Start Baseline Assessment" button
- **Next**: ElevenLabs Baseline Assessment

### 4. ElevenLabs Baseline Assessment
- **Trigger**: User starts baseline from welcome screen
- **Content**: Voice-powered mental health assessment using ElevenLabs AI
- **Process**: 
  - Interactive voice conversation
  - AI-powered mental health evaluation
  - Real-time processing of responses
- **Data Generated**: 
  - Initial mental health baseline score
  - Assessment session data
  - Voice analysis results (processed, not stored)
- **Duration**: ~10-15 minutes
- **Next**: Dashboard (with baseline data)

### 5. Dashboard (Post-Baseline)
- **Trigger**: Baseline assessment completion
- **Content**: 
  - **User Name**: Personalized greeting
  - **Baseline Score**: Initial mental health score from assessment
  - **Empty Dashboard**: No additional data yet (first time)
  - **Check-in Prompt**: Invitation to do first conversational check-in
- **Available Actions**: 
  - Start conversational check-in
  - View profile settings
  - Access help/resources
- **Next**: User can start regular check-ins to populate dashboard

## 🔄 Returning User Flow

### 1. Returning User Splash Screen
- **Trigger**: App open, user has BOTH authenticated AND completed baseline assessment
- **Content**: "Welcome back" message, quick app reminder
- **Authentication**: **NO AUTHENTICATION REQUIRED** (session persisted)
- **Action**: "Continue" or automatic progression
- **Next**: Dashboard (with historical data)

### 1b. Returning User Without Baseline
- **Trigger**: App open, user has authenticated but NOT completed baseline
- **Content**: Same as new user - goes to Baseline Welcome Screen
- **Reason**: Dashboard would be empty without baseline data
- **Next**: Baseline Welcome → ElevenLabs Assessment → Dashboard

### 2. Dashboard (Returning User)
- **Trigger**: Returning user splash completion
- **Content**:
  - **User Name**: Personalized greeting
  - **Current Score**: Latest mental health score
  - **Historical Data**: Previous check-ins, trends, insights
  - **Dashboard Widgets**: 
    - Recent check-ins
    - Wellness trends
    - Progress tracking
    - Recommendations
- **Available Actions**:
  - New conversational check-in
  - View detailed history
  - Access buddy system
  - Profile/settings management

## 🗣️ Ongoing Check-in Flow

### Conversational Check-in Process
- **Trigger**: User initiates check-in from dashboard
- **Type**: Voice-powered conversation using ElevenLabs
- **Content**: 
  - Daily/weekly mood assessment
  - Current mental state evaluation
  - Contextual follow-up questions
- **Data Generated**:
  - Updated wellness score
  - Check-in session data
  - Trend analysis
- **Result**: Dashboard updates with new data

## 🔐 Authentication States

### Session Management
- **New Users**: Require full registration flow
- **Returning Users**: Persistent session, no re-authentication needed
- **Session Expiry**: Graceful re-authentication if session expires
- **Security**: Supabase handles session management and security

### State Determination Logic
```typescript
// Correct logic for app state determination
if (!user) {
  // No authentication session
  return 'new_user_splash'; // → registration
} else if (user && !user.hasCompletedBaseline) {
  // User authenticated but no baseline (dashboard would be empty)
  return 'baseline_welcome'; // → ElevenLabs assessment
} else if (user && user.hasCompletedBaseline) {
  // User authenticated AND has baseline data
  return 'returning_user_splash'; // → dashboard with data
}
```

## 📊 Data Progression

### Baseline Assessment Data
- **Initial State**: Empty user profile
- **Post-Registration**: Basic profile data (name, email, preferences)
- **Post-Baseline**: 
  - Baseline mental health score
  - Initial assessment session
  - User baseline metrics
  - Profile marked as "baseline_completed"

### Check-in Data Accumulation
- **First Check-in**: First additional data point
- **Ongoing Check-ins**: Build trend data, historical insights
- **Dashboard Evolution**: More widgets and insights as data accumulates

## 🎯 Key Technical Requirements

### Authentication Flow
1. **Registration**: Supabase user creation with profile
2. **Session Persistence**: Automatic login for returning users
3. **Baseline Tracking**: Flag in user profile for baseline completion
4. **Score Storage**: Baseline and check-in scores in database

### ElevenLabs Integration Points
1. **Baseline Assessment**: Full voice-powered baseline evaluation
2. **Regular Check-ins**: Conversational mood and wellness tracking
3. **Data Processing**: Voice analysis → wellness scores → dashboard updates

### Dashboard Data Requirements
- **User Info**: Name, current score, baseline date
- **Historical Data**: Previous check-ins, score trends
- **Analytics**: Progress tracking, insights, recommendations
- **Actions**: Check-in buttons, navigation, settings access

## 🔄 State Transitions

### Critical Transition Points
1. **Splash → Registration**: New user onboarding start
2. **Registration → Baseline Welcome**: Account created, ready for assessment
3. **Baseline Welcome → Assessment**: User commits to baseline process
4. **Assessment → Dashboard**: Baseline completed, user can access main app
5. **Dashboard → Check-in**: Ongoing wellness tracking
6. **Return → Dashboard**: Seamless re-entry for returning users

### Error Handling
- **Registration Failure**: Return to splash with error message
- **Assessment Interruption**: Save progress, allow resume
- **Session Expiry**: Graceful re-authentication
- **Network Issues**: Offline mode with sync when reconnected

## 📋 Implementation Checklist

### Authentication & Flow Control
- [ ] Fix current authentication loop issue
- [ ] Implement proper baseline completion tracking
- [ ] Add returning user session persistence
- [ ] Create baseline welcome screen
- [ ] Update dashboard for post-baseline state

### ElevenLabs Integration
- [ ] Restore ElevenLabs baseline assessment
- [ ] Implement conversational check-ins
- [ ] Connect voice analysis to scoring system
- [ ] Add progress saving for interrupted assessments

### Dashboard Development
- [ ] Design empty dashboard state (post-baseline)
- [ ] Create populated dashboard (returning users)
- [ ] Add check-in initiation flow
- [ ] Implement historical data display

### Data & Persistence
- [ ] Ensure baseline completion flag in user profile
- [ ] Connect assessment results to dashboard display
- [ ] Implement check-in data accumulation
- [ ] Add offline/sync capabilities

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Owner**: Keith Duddy  
**Review Date**: Monthly

**Critical Note**: This flow must be maintained exactly as specified to ensure proper user experience and data progression.
