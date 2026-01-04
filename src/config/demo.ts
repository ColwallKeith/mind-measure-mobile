/**
 * Demo Configuration for University of Worcester
 * 
 * This configuration ensures that the Mind Measure demo
 * is properly set up for the University of Worcester.
 */

export const DEMO_CONFIG = {
  // University Configuration
  university: {
    id: 'worcester',
    name: 'University of Worcester',
    shortName: 'UW',
    slug: 'worcester',
    primaryColor: '#0BA66D',
    secondaryColor: '#065F46',
    logo: '/images/worcester-logo.png',
    website: 'https://www.worcester.ac.uk',
    contactEmail: 'admin@worcester.ac.uk',
    contactPhone: '+44 1905 855000',
    address: 'Henwick Grove',
    postcode: 'WR2 6AJ',
    established: 2005,
    totalStudents: 10500
  },

  // Demo User Configuration
  demoUsers: [
    {
      email: 'keith@dicestudio.com',
      firstName: 'Keith',
      lastName: 'Duddy',
      role: 'demo_admin'
    },
    {
      email: 'demo.student@worcester.ac.uk',
      firstName: 'Demo',
      lastName: 'Student',
      role: 'student'
    }
  ],

  // App Configuration
  app: {
    autoAssignUniversity: true, // Automatically assign Worcester to all new users
    skipUniversitySelection: true, // Skip university selection in onboarding
    enableDemoMode: true, // Enable demo-specific features
    showDemoIndicator: false // Don't show demo indicator in production demo
  },

  // Feature Flags for Demo
  features: {
    enableFullPipeline: true, // Enable complete analysis pipeline
    enableRealTimeAnalysis: true, // Enable real-time Rekognition analysis
    enableLambdaFunctions: true, // Use AWS Lambda for scoring
    enableMockData: false, // Use real data, not mock data
    enableDebugLogging: true // Enable detailed logging for demo
  },

  // Emergency Contacts for Worcester
  emergencyContacts: [
    {
      name: 'University Counselling Service',
      phone: '+44 1905 855000',
      email: 'counselling@worcester.ac.uk',
      available: '9am-5pm, Monday-Friday'
    },
    {
      name: 'Samaritans',
      phone: '116 123',
      email: 'jo@samaritans.org',
      available: '24/7'
    },
    {
      name: 'NHS Crisis Team',
      phone: '111',
      available: '24/7'
    }
  ],

  // Mental Health Services for Worcester
  mentalHealthServices: [
    {
      name: 'Student Wellbeing Team',
      description: 'Professional counselling and mental health support',
      contact: 'wellbeing@worcester.ac.uk',
      phone: '+44 1905 855001',
      location: 'Student Services Building',
      bookingUrl: 'https://worcester.ac.uk/wellbeing'
    },
    {
      name: 'Peer Support Network',
      description: 'Student-led support groups and peer mentoring',
      contact: 'peersupport@worcester.ac.uk',
      location: 'Various campus locations'
    }
  ]
};

/**
 * Get the demo configuration
 */
export function getDemoConfig() {
  return DEMO_CONFIG;
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return DEMO_CONFIG.app.enableDemoMode;
}

/**
 * Get the default university for demo
 */
export function getDemoUniversity() {
  return DEMO_CONFIG.university;
}

/**
 * Check if university should be auto-assigned
 */
export function shouldAutoAssignUniversity(): boolean {
  return DEMO_CONFIG.app.autoAssignUniversity;
}





