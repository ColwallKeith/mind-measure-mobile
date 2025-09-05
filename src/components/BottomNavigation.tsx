import { Home, Heart, Users, TrendingUp, HelpCircle, User } from 'lucide-react';

interface BottomNavigationProps {
  activeScreen: 'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile';
  onScreenChange: (screen: 'dashboard' | 'checkin' | 'buddy' | 'help' | 'profile') => void;
}

export function BottomNavigation({ activeScreen, onScreenChange }: BottomNavigationProps) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home', screen: 'dashboard' as const },
    { id: 'checkin', icon: Heart, label: 'Check-in', screen: 'checkin' as const },
    { id: 'buddy', icon: Users, label: 'Buddy', screen: 'buddy' as const },
    { id: 'profile', icon: User, label: 'Profile', screen: 'profile' as const },
    { id: 'help', icon: HelpCircle, label: 'Help', screen: 'help' as const },
  ];

  return (
    <div className="relative">
      {/* Glass background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-2xl border-t border-white/20" />
      
      {/* Navigation content */}
      <div className="relative z-10 px-6 py-4">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.screen === activeScreen;
            
            return (
              <button
                key={item.id}
                onClick={() => item.screen && onScreenChange(item.screen)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl scale-105' 
                    : 'hover:bg-white/30 hover:backdrop-blur-xl'
                }`}
              >
                <Icon 
                  className={`w-6 h-6 transition-colors duration-200 ${
                    isActive ? 'text-purple-600' : 'text-gray-500'
                  }`} 
                />
                <span 
                  className={`text-xs transition-colors duration-200 ${
                    isActive ? 'text-purple-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}