import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Target, TrendingUp, Brain, Shield, Heart, Clock } from 'lucide-react';
const mindMeasureLogo = "https://app.mindmeasure.co.uk/images/mind-measure-logo.png";
interface BaselineAssessmentScreenProps {
  onStartAssessment: () => void;
}
export function BaselineAssessmentScreen({ onStartAssessment }: BaselineAssessmentScreenProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };
  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center pt-8">
        <motion.div
          className="w-24 h-24 mx-auto mb-6 flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img
            src={mindMeasureLogo}
            alt="Mind Measure"
            className="w-full h-full object-contain"
          />
        </motion.div>
        <motion.h1
          className="text-3xl text-gray-900 mb-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Welcome to Mind Measure!
        </motion.h1>
        <motion.p
          className="text-gray-600 leading-relaxed"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Let's establish your personal wellness baseline with Jodie
        </motion.p>
      </motion.div>
      {/* Why Baseline Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-purple-50/70 to-pink-50/70 p-6">
          <div className="flex items-start gap-4">
            <motion.div
              className="w-12 h-12 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl flex-shrink-0"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Target className="w-6 h-6 text-purple-600" />
            </motion.div>
            <div>
              <h3 className="text-purple-900 mb-2">Why a Baseline Assessment?</h3>
              <p className="text-purple-700 text-sm leading-relaxed">
                This helps us understand your current wellness state, creating a personalised starting point for your mental health journey.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
      {/* Start Baseline Button */}
      <motion.div
        variants={itemVariants}
        className="text-center space-y-4"
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onStartAssessment}
            className="w-full h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 border-0 shadow-2xl text-lg backdrop-blur-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
          >
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Play className="w-6 h-6 mr-3" />
            </motion.div>
            Start Your Baseline Assessment
          </Button>
        </motion.div>
        <motion.p
          className="text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Find a quiet, comfortable space where you can speak freely
        </motion.p>
      </motion.div>
      {/* What We'll Measure */}
      <div className="space-y-4">
        <h3 className="text-gray-900 text-center">What We'll Measure</h3>
        <div className="space-y-3">
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-blue-900 mb-1">Mental State</h4>
                <p className="text-blue-700 text-sm">Current emotional and cognitive patterns</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-green-900 mb-1">Wellness Trends</h4>
                <p className="text-green-700 text-sm">Sleep, energy, and mood patterns</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-amber-50/70 p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Heart className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-amber-900 mb-1">Stress Indicators</h4>
                <p className="text-amber-700 text-sm">Voice, expression, and language analysis</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      {/* Assessment Details */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-indigo-50/70 p-4 text-center">
          <Clock className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
          <h4 className="text-indigo-900 mb-1">3-5 Minutes</h4>
          <p className="text-indigo-700 text-xs">Quick and comprehensive</p>
        </Card>
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-teal-50/70 p-4 text-center">
          <Shield className="w-8 h-8 text-teal-600 mx-auto mb-2" />
          <h4 className="text-teal-900 mb-1">100% Private</h4>
          <p className="text-teal-700 text-xs">Encrypted and secure</p>
        </Card>
      </div>
      {/* Benefits */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-rose-50/70 p-6">
        <div className="text-center">
          <h4 className="text-rose-900 mb-3">After Your Baseline</h4>
          <div className="space-y-2">
            <p className="text-rose-700 text-sm">✓ Personalised wellness insights</p>
            <p className="text-rose-700 text-sm">✓ Tailored recommendations</p>
            <p className="text-rose-700 text-sm">✓ Progress tracking over time</p>
          </div>
        </div>
      </Card>
      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </motion.div>
  );
}
