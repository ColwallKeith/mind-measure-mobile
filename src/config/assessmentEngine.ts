/**
 * Assessment Engine Configuration
 * 
 * Centralized configuration for Assessment Engine API endpoints
 */

export const assessmentEngineConfig = {
  // Use relative URLs so they work in both dev and prod
  baseUrl: '/api/assessment-engine',
  
  endpoints: {
    startCheckIn: '/api/assessment-engine/start-checkin',
    completeCheckIn: '/api/assessment-engine/complete-checkin',
    getCheckIn: '/api/assessment-engine/get-checkin'
  },
  
  // Polling configuration for check-in status
  polling: {
    interval: 5000, // 5 seconds
    maxAttempts: 60, // 5 minutes total (60 * 5s = 300s)
    timeout: 300000  // 5 minutes in milliseconds
  }
};
