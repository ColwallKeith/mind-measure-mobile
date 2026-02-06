import { useEffect } from 'react';
import { motion } from 'motion/react';
import mindMeasureLogo from '@/assets/Mindmeasure_logo.png';
interface ReturningSplashScreenProps {
  onComplete: () => void;
}
export function ReturningSplashScreen({ onComplete }: ReturningSplashScreenProps) {
  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.3
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.5
      }
    }
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };
  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };
  const gradientVariants = {
    animate: {
      background: [
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
        "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      ],
      transition: {
        duration: 6,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        variants={gradientVariants}
        animate="animate"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        }}
      />
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-black/5" />
      {/* Floating orbs for liquid glass effect */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl"
        animate={{
          y: [0, -15, 0],
          x: [0, 10, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-white/8 rounded-full blur-xl"
        animate={{
          y: [0, 10, 0],
          x: [0, -8, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />
      {/* Content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Logo */}
        <motion.div
          className="mb-6"
          variants={logoVariants}
          animate={["visible", "pulse"]}
        >
          <div className="w-32 h-32 p-4 bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20">
            <img
              src={mindMeasureLogo}
              alt="Mind Measure"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>
        {/* App Name */}
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-semibold text-white mb-3">
            Mind Measure
          </h1>
        </motion.div>
        {/* Tagline */}
        <motion.div variants={itemVariants}>
          <p className="text-white/90 text-lg font-medium">
            Measure • Monitor • Manage
          </p>
        </motion.div>
        {/* Subtle loading indicator */}
        <motion.div
          className="mt-8 w-12 h-1 bg-white/30 rounded-full overflow-hidden"
          variants={itemVariants}
        >
          <motion.div
            className="h-full bg-white/60 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}