import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User,
  Mail,
  GraduationCap,
  Calendar,
  TrendingUp,
  Target,
  Sparkles,
  Clock,
  Moon,
  Dumbbell,
  BookOpen,
  Users,
  Brain,
  Coffee,
  Smartphone,
  Sun,
  DollarSign,
  Edit,
  Download,
  FileText,
  Shield,
  ChevronRight,
  BarChart3,
  Heart
} from 'lucide-react';
import mindMeasureLogo from '../../assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';
export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'wellness' | 'institutional'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  // User data
  const [userData, setUserData] = useState({
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@worc.ac.uk',
    course: 'Social Sciences',
    yearOfStudy: 'Year 2',
    studyMode: 'Full-time',
    residence: 'On Campus',
    domicile: 'Home'
  });
  // Wellness stats
  const wellnessStats = {
    currentStreak: 7,
    longestStreak: 23,
    totalCheckIns: 45,
    averageScore: 72,
    moodTrend: 'Improving',
    topThemes: ['academic pressure', 'social connections', 'exercise', 'sleep']
  };
  // Additional tracking metrics that students might want
  const trackingMetrics = [
    { icon: Moon, label: 'Sleep Quality', value: '7.2/10', trend: '+0.3', color: 'purple' },
    { icon: Dumbbell, label: 'Exercise Frequency', value: '4x/week', trend: '+1', color: 'green' },
    { icon: BookOpen, label: 'Study Hours', value: '32h/week', trend: '-2h', color: 'blue' },
    { icon: Users, label: 'Social Activities', value: '3x/week', trend: '+1', color: 'pink' },
    { icon: Brain, label: 'Focus Level', value: '6.8/10', trend: '+0.5', color: 'indigo' },
    { icon: Coffee, label: 'Caffeine Intake', value: '2 cups/day', trend: '-1', color: 'amber' },
    { icon: Smartphone, label: 'Screen Time', value: '5.2h/day', trend: '-0.8h', color: 'red' },
    { icon: Sun, label: 'Outdoor Time', value: '1.5h/day', trend: '+0.3h', color: 'orange' },
    { icon: DollarSign, label: 'Financial Stress', value: '4/10', trend: '-1', color: 'emerald' }
  ];
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-blue-400 to-cyan-500';
    if (score >= 40) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };
  const TabButton = ({ tab, label, isActive, onClick }: {
    tab: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
        isActive
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
          : 'bg-white/60 text-gray-600 hover:bg-white/80'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-50 px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pt-8">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img
            src={mindMeasureLogo}
            alt="Mind Measure"
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <h1 className="text-gray-900 text-center mb-2 text-lg">Your Profile</h1>
        <p className="text-gray-600 text-sm text-center">Your wellness journey & institutional info</p>
      </div>
      {/* User Profile Card */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
            <div className="text-lg">
              {getInitials(userData.firstName, userData.lastName)}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-1 text-sm">{userData.firstName} {userData.lastName}</h3>
            <p className="text-gray-600 text-sm mb-2">{userData.email}</p>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-500" />
              <span className="text-blue-700 text-sm">{userData.course}</span>
            </div>
          </div>
        </div>
      </Card>
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-white/60 rounded-xl backdrop-blur-sm">
        <TabButton
          tab="overview"
          label="Overview"
          isActive={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          tab="wellness"
          label="Wellness"
          isActive={activeTab === 'wellness'}
          onClick={() => setActiveTab('wellness')}
        />
        <TabButton
          tab="institutional"
          label="Institutional"
          isActive={activeTab === 'institutional'}
          onClick={() => setActiveTab('institutional')}
        />
      </div>
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-green-50/80 to-blue-50/80 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xl text-green-900">{wellnessStats.currentStreak}</div>
                  <div className="text-green-700 text-sm">Day Streak</div>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-blue-50/80 to-purple-50/80 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl text-blue-900">{wellnessStats.averageScore}</div>
                  <div className="text-blue-700 text-sm">Avg Score</div>
                </div>
              </div>
            </Card>
          </div>
          {/* Top Wellness Themes */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="text-gray-900 text-sm">Your Top Wellness Themes</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {wellnessStats.topThemes.map((theme, index) => (
                <Badge key={index} className="bg-purple-100 text-purple-700 border-0">
                  {theme}
                </Badge>
              ))}
            </div>
          </Card>
          {/* Mood Trend */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-gray-900 text-sm">Mood Trend</h3>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0">
                {wellnessStats.moodTrend}
              </Badge>
            </div>
            <p className="text-gray-600 text-sm">Based on your last 10 check-ins</p>
          </Card>
          {/* AI Wellness Report Preview */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br from-purple-50/80 to-pink-50/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="text-purple-900 text-sm">AI Wellness Report</h3>
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">
                Updated 2025-01-25
              </Badge>
            </div>
            <p className="text-purple-800 text-sm mb-4">
              Over the past 3 months, you've shown consistent improvement in managing academic stress through regular exercise and maintaining social connections. Your sleep patterns have stabilized, contributing to better overall wellbeing.
            </p>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white w-full">
              <FileText className="w-4 h-4 mr-2" />
              View Full Report
            </Button>
          </Card>
        </div>
      )}
      {/* Wellness Tab */}
      {activeTab === 'wellness' && (
        <div className="space-y-6">
          {/* Wellness Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-blue-900">{wellnessStats.currentStreak}</div>
                <div className="text-blue-700 text-sm">Current Streak</div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-green-900">{wellnessStats.longestStreak}</div>
                <div className="text-green-700 text-sm">Longest Streak</div>
              </div>
            </Card>
            <Card className="border-0 shadow-lg backdrop-blur-xl bg-purple-50/70 p-4">
              <div className="text-center">
                <div className="text-lg text-purple-900">{wellnessStats.totalCheckIns}</div>
                <div className="text-purple-700 text-sm">Total Check-ins</div>
              </div>
            </Card>
            <Card className={`border-0 shadow-lg backdrop-blur-xl bg-gradient-to-br ${getScoreColor(wellnessStats.averageScore)}/20 p-4`}>
              <div className="text-center">
                <div className="text-lg text-gray-900">{wellnessStats.averageScore}</div>
                <div className="text-gray-700 text-sm">Average Score</div>
              </div>
            </Card>
          </div>
          {/* Detailed Tracking Metrics */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <h3 className="text-gray-900 mb-4 text-sm">Your Wellbeing Metrics</h3>
            <Accordion type="single" collapsible>
              <AccordionItem value="lifestyle">
                <AccordionTrigger className="text-gray-800">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Lifestyle & Health
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pt-2">
                    {trackingMetrics.slice(0, 3).map((metric, index) => {
                      const Icon = metric.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-${metric.color}-100 rounded-full flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 text-${metric.color}-600`} />
                            </div>
                            <span className="text-gray-700">{metric.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-900">{metric.value}</div>
                            <div className={`text-xs ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {metric.trend}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="academic">
                <AccordionTrigger className="text-gray-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Academic & Social
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pt-2">
                    {trackingMetrics.slice(3, 6).map((metric, index) => {
                      const Icon = metric.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-${metric.color}-100 rounded-full flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 text-${metric.color}-600`} />
                            </div>
                            <span className="text-gray-700">{metric.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-900">{metric.value}</div>
                            <div className={`text-xs ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {metric.trend}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="digital">
                <AccordionTrigger className="text-gray-800">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    Digital & Environmental
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-3 pt-2">
                    {trackingMetrics.slice(6).map((metric, index) => {
                      const Icon = metric.icon;
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50/60 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-${metric.color}-100 rounded-full flex items-center justify-center`}>
                              <Icon className={`w-4 h-4 text-${metric.color}-600`} />
                            </div>
                            <span className="text-gray-700">{metric.label}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-gray-900">{metric.value}</div>
                            <div className={`text-xs ${metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                              {metric.trend}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
          {/* Export Data */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-green-50/70 p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-green-900 mb-2 text-sm">This is YOUR Data</h4>
                <div className="text-green-700 text-sm space-y-1 mb-4">
                  <div>• Every conversation, score, and insight belongs to you</div>
                  <div>• Use this data for personal reflection and growth</div>
                  <div>• Share with therapists or counselors when helpful</div>
                  <div>• Export and keep for your personal records</div>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Institutional Tab */}
      {activeTab === 'institutional' && (
        <div className="space-y-6">
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-gray-900 text-sm">Institutional Information</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/60 border-gray-200"
              >
                <Edit className="w-4 h-4 mr-1" />
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-gray-800 mb-3 text-sm">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-gray-700">First Name</Label>
                    <Input
                      id="firstName"
                      value={userData.firstName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({...userData, firstName: e.target.value})}
                      className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-gray-700">Last Name</Label>
                    <Input
                      id="lastName"
                      value={userData.lastName}
                      disabled={!isEditing}
                      onChange={(e) => setUserData({...userData, lastName: e.target.value})}
                      className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="email" className="text-gray-700">University Email</Label>
                  <Input
                    id="email"
                    value={userData.email}
                    disabled
                    className="bg-gray-50/60 border-gray-200"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    This email is used for institutional data analysis and cannot be changed
                  </p>
                </div>
              </div>
              {/* Academic Information */}
              <Accordion type="single" collapsible>
                <AccordionItem value="academic">
                  <AccordionTrigger className="text-gray-800">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      Academic Information
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="course" className="text-gray-700">Faculty/School</Label>
                          <Select disabled={!isEditing} value={userData.course}>
                            <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Social Sciences">Social Sciences</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Arts">Arts</SelectItem>
                              <SelectItem value="Sciences">Sciences</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="year" className="text-gray-700">Year of Study</Label>
                          <Select disabled={!isEditing} value={userData.yearOfStudy}>
                            <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Year 1">Year 1</SelectItem>
                              <SelectItem value="Year 2">Year 2</SelectItem>
                              <SelectItem value="Year 3">Year 3</SelectItem>
                              <SelectItem value="Year 4">Year 4</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="studyMode" className="text-gray-700">Study Mode</Label>
                        <Select disabled={!isEditing} value={userData.studyMode}>
                          <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="living">
                  <AccordionTrigger className="text-gray-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      Living Situation
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="residence" className="text-gray-700">Residence</Label>
                        <Select disabled={!isEditing} value={userData.residence}>
                          <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="On Campus">On Campus</SelectItem>
                            <SelectItem value="Off Campus">Off Campus</SelectItem>
                            <SelectItem value="At Home">At Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="domicile" className="text-gray-700">Domicile</Label>
                        <Select disabled={!isEditing} value={userData.domicile}>
                          <SelectTrigger className={`${isEditing ? 'bg-white' : 'bg-gray-50/60'} border-gray-200`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Home">Home</SelectItem>
                            <SelectItem value="International">International</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </Card>
          {/* Privacy Information */}
          <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-blue-900 mb-2 text-sm">How we use your information</h4>
                <div className="text-blue-700 text-sm space-y-2">
                  <div>• Your personal details are kept private and secure</div>
                  <div>• Academic information helps universities understand student wellbeing patterns</div>
                  <div>• Data is anonymized for institutional research and support services</div>
                  <div>• You can update or remove your information at any time</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}
// Keep the original export for compatibility
export const MobileProfile = ProfileScreen;