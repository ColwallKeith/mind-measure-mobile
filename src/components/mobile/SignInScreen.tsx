import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface SignInScreenProps {
  onSignInComplete: () => void;
  onBack: () => void;
}

export function SignInScreen({ onSignInComplete, onBack }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('🔐 Signing in user:', email);
    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      setError(signInError);
      setIsLoading(false);
    } else {
      console.log('✅ Sign in successful - tokens stored on device');
      onSignInComplete();
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="font-medium text-base">Back</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Sign In</h1>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <motion.div
        className="flex-1 px-6 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <div className="w-20 h-20 flex items-center justify-center">
              <img
                src={mindMeasureLogo}
                alt="Mind Measure"
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-gray-900 text-center mb-2">
            Welcome back
          </motion.h2>
          <motion.p variants={itemVariants} className="text-gray-600 text-center mb-8">
            Sign in to continue your wellness journey
          </motion.p>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@university.ac.uk"
                  className="w-full h-14 px-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                  style={{ paddingLeft: '2rem' }}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-14 px-4 pr-14 text-base border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all"
                  style={{ paddingLeft: '2rem' }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200"
              >
                <p className="text-sm font-medium">{error}</p>
                
                {/* Sign Out Button if already signed in */}
                {error.includes('already a signed in user') && (
                  <button
                    type="button"
                    onClick={async () => {
                      console.log('🔄 Signing out existing user...');
                      setIsLoading(true);
                      setError(null);
                      try {
                        const { amplifyAuth } = await import('@/services/amplify-auth');
                        await amplifyAuth.signOut();
                        console.log('✅ Signed out successfully');
                        
                        // Clear device preferences too
                        const { Preferences } = await import('@capacitor/preferences');
                        await Preferences.clear();
                        console.log('✅ Device data cleared');
                        
                        // Reload the page to start fresh
                        window.location.reload();
                      } catch (err) {
                        console.error('❌ Error signing out:', err);
                        setError('Failed to sign out. Please close and reopen the app.');
                        setIsLoading(false);
                      }
                    }}
                    className="mt-3 w-full h-12 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                    disabled={isLoading}
                  >
                    Sign Out and Try Again
                  </button>
                )}
              </motion.div>
            )}

            {/* Sign In Button */}
            <motion.button
              variants={itemVariants}
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-lg rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-blue-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
              style={{
                background: isLoading ? undefined : 'linear-gradient(to right, rgb(147 51 234), rgb(37 99 235))',
                color: 'white'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </motion.button>
          </form>

          {/* Help Text */}
          <motion.div variants={itemVariants} className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-900 text-center">
              First time signing in after verifying your email?<br />
              Use the password you created during registration.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
