import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface BaselineAssessmentScreenProps {
  onStartAssessment: () => void;
}

export function BaselineAssessmentScreen({ onStartAssessment }: BaselineAssessmentScreenProps) {
  const handleStartWithHaptics = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.log('Haptics not available');
    }
    onStartAssessment();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col px-6 py-6">
      {/* Header */}
      <div className="text-center pt-4 pb-4">
        <h2 className="text-xl font-light text-gray-700">
          Your Baseline Assessment
        </h2>
      </div>

      {/* What to expect card - positioned higher with more space for button */}
      <div className="flex-1 flex items-start justify-center pt-8">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm shadow-xl rounded-3xl p-8 border-0">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src={mindMeasureLogo}
                alt="Mind Measure"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-semibold text-gray-900 text-center mb-6">
            What to expect
          </h3>

          {/* Bullet points */}
          <div className="space-y-4 text-gray-700 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <p className="flex-1 text-base">Five questions from Jodie</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <p className="flex-1 text-base">3-5 minutes max</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <p className="flex-1 text-base leading-relaxed">
                We use your camera so make sure you are looking at the screen
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <p className="flex-1 text-base leading-relaxed">
                We analyse your voice to understand your mood
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-purple-500 mt-1">•</span>
              <p className="flex-1 text-base leading-relaxed">
                We delete any voice and images we collect as soon as we have analysed them
              </p>
            </div>
          </div>

          {/* Start button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleStartWithHaptics}
              className="w-full h-14 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium text-lg rounded-2xl shadow-lg border-0 transition-all duration-300"
            >
              Start Baseline Assessment
            </Button>
          </motion.div>
        </Card>
      </div>

      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}
