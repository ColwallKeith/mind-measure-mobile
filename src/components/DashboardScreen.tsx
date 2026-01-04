import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MessageCircle, Activity, Shield, Phone } from 'lucide-react';
import { ScoreCard } from './ScoreCard';

interface DashboardScreenProps {
  onNeedHelp?: () => void;
}

export function DashboardScreen({ onNeedHelp }: DashboardScreenProps) {
  return (
    <div className="px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pt-8">
        <h1 className="text-3xl text-gray-900 mb-2">Good morning, Alex</h1>
        <p className="text-gray-600">Here's your latest mental health snapshot</p>
      </div>

      {/* Current Score Card */}
      <ScoreCard 
        score={72} 
        lastUpdated="27/08/2025"
        trend="up"
      />

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-gray-900">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-14 bg-gradient-to-r from-purple-500 to-pink-500 border-0 shadow-lg backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-105">
            <MessageCircle className="w-5 h-5 mr-2" />
            Check-in
          </Button>
          <Button 
            onClick={onNeedHelp}
            className="h-14 bg-gradient-to-r from-red-500 to-orange-500 border-0 shadow-lg backdrop-blur-xl hover:shadow-xl transition-all duration-300 hover:scale-105 text-white"
          >
            <Phone className="w-5 h-5 mr-2" />
            Need Help
          </Button>
        </div>
      </div>

      {/* Key Themes */}
      <div className="space-y-4">
        <h3 className="text-gray-900">Key Themes</h3>
        <div className="flex flex-wrap gap-2">
          {['stress', 'exams', 'sleep', 'friends', 'family', 'exercise'].map((theme) => (
            <Badge 
              key={theme} 
              variant="secondary" 
              className="px-4 py-2 bg-white/60 backdrop-blur-md border-0 shadow-sm hover:bg-white/70 transition-all duration-200"
            >
              {theme}
            </Badge>
          ))}
        </div>
      </div>

      {/* Latest Check-in */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-gray-900">Latest Check-in</h3>
          <p className="text-gray-500 text-sm">27/08/2025</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-gray-800 mb-2">Conversation Summary</h4>
            <p className="text-gray-600 text-sm leading-relaxed">
              You discussed feeling overwhelmed with upcoming exams but also mentioned positive social connections and exercise routines that help you cope.
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mood Score</span>
            <span className="text-2xl">6/10</span>
          </div>
        </div>
      </Card>

      {/* Topics Discussed */}
      <div className="space-y-4">
        <h3 className="text-gray-900">Topics Discussed</h3>
        <div className="space-y-3">
          <Card className="border-0 shadow-sm backdrop-blur-xl bg-green-50/80 p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <div>
                <p className="text-green-800 mb-1">Finding Pleasure In</p>
                <div className="flex gap-2">
                  {['academic pressure', 'social connections', 'self-care'].map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs border-green-300 text-green-700 bg-green-100/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="border-0 shadow-sm backdrop-blur-xl bg-orange-50/80 p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <div>
                <p className="text-orange-800 mb-1">Causing Concern</p>
                <div className="flex gap-2">
                  {['academic pressure', 'social connections', 'self-care'].map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-100/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
        <h3 className="text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-800">Check-in Complete</p>
            <p className="text-gray-500 text-sm">Score: 72 (Good)</p>
          </div>
          <p className="text-gray-400 text-sm">2h ago</p>
        </div>
      </Card>

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}