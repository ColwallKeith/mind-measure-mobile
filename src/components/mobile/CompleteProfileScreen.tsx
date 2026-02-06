/**
 * Post-baseline "Complete your profile" step.
 * Shown after baseline assessment, before dashboard. Marks profile_completed when done.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

export interface CompleteProfileScreenProps {
  onComplete: () => void;
}

const YEAR_OPTIONS = ['1', '2', '3', '4', '5', 'Other'];

export function CompleteProfileScreen({ onComplete }: CompleteProfileScreenProps) {
  const { user } = useAuth();
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [course, setCourse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = yearOfStudy.trim() !== '' && course.trim() !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setError(null);
    setIsLoading(true);
    try {
      const backendService = BackendServiceFactory.createService(
        BackendServiceFactory.getEnvironmentConfig()
      );
      await backendService.database.update(
        'profiles',
        {
          year_of_study: yearOfStudy.trim(),
          course: course.trim(),
          profile_completed: true,
          profile_completed_at: new Date().toISOString()
        },
        { user_id: user.id }
      );
      onComplete();
    } catch (err) {
      console.error('Complete profile error:', err);
      setError('Could not save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 overflow-y-auto">
      <div
        className="bg-white border-b border-gray-100"
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center justify-center px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">Complete your profile</h1>
        </div>
      </div>
      <motion.div
        className="flex-1 px-6 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ paddingBottom: 'max(20rem, calc(env(safe-area-inset-bottom) + 20rem))' }}
      >
        <div className="max-w-md mx-auto">
          <div className="flex justify-center mb-6">
            <img
              src={mindMeasureLogo}
              alt="Mind Measure"
              className="w-20 h-20 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Almost there
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Add a couple of details so we can personalise your experience.
          </p>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                Year of study
              </label>
              <select
                id="year"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all bg-white"
                disabled={isLoading}
              >
                <option value="">Select year</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <input
                id="course"
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Psychology, Computer Science"
                className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
