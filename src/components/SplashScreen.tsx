import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Heart, Shield, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import mindMeasureLogo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';
import student1 from 'figma:asset/09faec71f9d3802be7219825a1035943a576793f.png';
import student2 from 'figma:asset/a5ec0d9266e5c8d1d4ca0c6daf9753d43ff512ff.png';
import student3 from 'figma:asset/57232a2e8f77967ba1ae01ab3f5468b0c102a4b8.png';
import student4 from 'figma:asset/068152bfc12d21732b8aeafbd4eab27fa36c38dd.png';
import student5 from 'figma:asset/d0f6eaab8491562aeb8c3df2cfcd2c6a20b00e1e.png';
import student6 from 'figma:asset/bb827a19515889bb062d58859b831662378c36cb.png';

interface SplashScreenProps {
  onGetStarted: () => void;
}

export function SplashScreen({ onGetStarted }: SplashScreenProps) {
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const taglineWords = ['Measure', 'Monitor', 'Manage'];
  
  // Array of authentic Mind Measure student images
  const studentImages = [
    {
      src: student1,
      alt: "Mind Measure student with sunglasses and colorful jacket"
    },
    {
      src: student2,
      alt: "Mind Measure student with confident pose"
    },
    {
      src: student3,
      alt: "Mind Measure student looking thoughtful"
    },
    {
      src: student4,
      alt: "Mind Measure student with pink knit scarf smiling warmly"
    },
    {
      src: student5,
      alt: "Mind Measure student with glasses and blonde hair"
    },
    {
      src: student6,
      alt: "Mind Measure student with curly hair in black top"
    }
  ];

  useEffect(() => {
    const taglineInterval = setInterval(() => {
      setCurrentTaglineIndex((prev) => (prev + 1) % taglineWords.length);
    }, 2000);
    return () => clearInterval(taglineInterval);
  }, []);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % studentImages.length);
    }, 4500); // Change image every 4.5 seconds for 6 students (27 second full cycle)
    return () => clearInterval(imageInterval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
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
    hidden: { scale: 0.5, opacity: 0, rotate: -10 },
    visible: {
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const gradientVariants = {
    animate: {
      background: [
        "linear-gradient(45deg, #8B5CF6, #EC4899, #06B6D4)",
        "linear-gradient(45deg, #EC4899, #06B6D4, #8B5CF6)",
        "linear-gradient(45deg, #06B6D4, #8B5CF6, #EC4899)"
      ],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "linear"
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <motion.div 
        className="absolute inset-0"
        variants={gradientVariants}
        animate="animate"
        style={{
          background: "linear-gradient(45deg, #8B5CF6, #EC4899, #06B6D4)"
        }}
      />
      
      {/* Floating orbs */}
      <motion.div 
        className="absolute top-20 left-10 w-32 h-32 bg-white/20 rounded-full blur-xl"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-32 right-10 w-24 h-24 bg-white/15 rounded-full blur-xl"
        animate={{
          y: [0, 15, 0],
          x: [0, -15, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute top-1/2 right-20 w-16 h-16 bg-white/10 rounded-full blur-lg"
        animate={{
          y: [0, -10, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content */}
      <motion.div 
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div 
          className="mb-8"
          variants={logoVariants}
          animate={["visible", "pulse"]}
        >
          <div className="w-24 h-24 p-4 bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30">
            <img 
              src={mindMeasureLogo} 
              alt="Mind Measure" 
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* App Name */}
        <motion.div variants={itemVariants} className="mb-4">
          <h1 className="text-4xl font-bold text-white mb-2">
            Mind Measure
          </h1>
        </motion.div>

        {/* Animated Tagline */}
        <motion.div variants={itemVariants} className="mb-12">
          <div className="flex items-center gap-2 text-white/90 text-lg">
            {taglineWords.map((word, index) => (
              <motion.span
                key={word}
                className={`transition-all duration-500 ${
                  index === currentTaglineIndex 
                    ? 'text-white font-semibold scale-110' 
                    : 'text-white/70'
                }`}
                animate={index === currentTaglineIndex ? { y: [-2, 0, -2] } : {}}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                {word}
                {index < taglineWords.length - 1 && (
                  <span className="mx-2 text-white/50">•</span>
                )}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Hero Image Carousel */}
        <motion.div 
          variants={itemVariants}
          className="mb-8 relative"
        >
          <div className="relative">
            <div className="w-48 h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 backdrop-blur-sm">
              {/* Image stack for smooth transitions */}
              {studentImages.map((image, index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ 
                    opacity: index === currentImageIndex ? 1 : 0,
                    scale: index === currentImageIndex ? 1 : 1.1,
                  }}
                  transition={{ 
                    duration: 0.8,
                    ease: "easeInOut"
                  }}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
              
              {/* Image transition overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none"
                animate={{
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            {/* Floating heart */}
            <motion.div 
              className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg"
              animate={{
                y: [0, -5, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Heart className="w-6 h-6 text-white fill-white" />
            </motion.div>

            {/* Image dots indicator */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {studentImages.map((_, index) => (
                <motion.div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex 
                      ? 'bg-white shadow-lg' 
                      : 'bg-white/40'
                  }`}
                  animate={{
                    scale: index === currentImageIndex ? 1.2 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Message */}
        <motion.div variants={itemVariants} className="mb-8 max-w-sm">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Empowering <span className="text-pink-200">every student's</span> mental wellness
          </h2>
          <p className="text-white/80 text-base leading-relaxed">
            Join thousands of students who use Mind Measure to understand and improve their wellbeing with just a few minutes each day.
          </p>
        </motion.div>

        {/* Features */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
            <Sparkles className="w-3 h-3 mr-1" />
            Free to use
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
            <Shield className="w-3 h-3 mr-1" />
            Private & secure
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
            <Clock className="w-3 h-3 mr-1" />
            Takes 3 minutes
          </Badge>
        </motion.div>

        {/* CTA Button */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            onClick={onGetStarted}
            className="bg-white text-purple-600 hover:bg-white/90 h-14 px-8 text-lg font-semibold rounded-2xl shadow-xl border-2 border-white/50 min-w-[280px]"
          >
            Take Your First Check-In
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.div>
          </Button>
        </motion.div>

        {/* Additional spacing for mobile */}
        <div className="h-8" />
      </motion.div>
    </div>
  );
}