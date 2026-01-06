/**
 * Mobile Components Barrel Export
 * 
 * Centralized exports for mobile-specific components.
 * These components are optimized for mobile interfaces.
 * 
 * Usage:
 * import { MobileConversation, LandingPage } from '@/components/mobile';
 */

// Core Mobile Components
export { default as LandingPage } from './LandingPage';
export { default as MobileConversation } from './MobileConversation';
export { default as RegistrationScreen } from './RegistrationScreen';

// Mobile Navigation
// BottomNavigation is now in @/components/BottomNavigation
export { default as MobileHeader } from './MobileHeader';

// Mobile Screens
export { default as CheckInScreen } from './CheckInScreen';
export { default as DashboardScreen } from './DashboardScreen';
export { default as ProfileScreen } from './ProfileScreen';
export { default as BuddyScreen } from './BuddyScreen';
export { default as HelpScreen } from './HelpScreen';

// Mobile UI Components
export { default as MobileCard } from './MobileCard';
export { default as MobileButton } from './MobileButton';
export { default as MobileInput } from './MobileInput';

// Assessment Components
export { default as BaselineAssessmentWidget } from './BaselineAssessmentWidget';
export { default as BaselineWelcomeScreen } from './BaselineWelcomeScreen';
export { default as EmailConfirmationScreen } from './EmailConfirmationScreen';

// Splash Screens
export { default as SplashScreen } from './SplashScreen';
export { default as ReturningSplashScreen } from './ReturningSplashScreen';

// Mobile Utilities
export { default as MobileDetector } from './MobileDetector';
export { default as TouchGestures } from './TouchGestures';
