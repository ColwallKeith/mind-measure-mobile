import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Bell, Shield, Moon, Palette, ArrowLeft, LogOut, ExternalLink, Eye } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PrivacyOverlay } from './PrivacyOverlay';
interface MobileSettingsProps {
  onNavigateBack: () => void;
}
export function MobileSettings({ onNavigateBack }: MobileSettingsProps) {
  const { preferences, loading, saving, updatePreference } = useUserPreferences();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out"
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };
  const handleExternalLink = (url: string) => {
    window.open(url, '_blank');
  };
  if (loading) {
    return (
      <div className="min-h-screen w-full px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 text-xs sm:text-sm">Customize your experience</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 text-sm sm:text-base">Loading settings...</div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 text-xs sm:text-sm">Customize your experience</p>
        </div>
      </div>
      {/* Notifications */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="checkin-reminders" className="text-gray-700 text-xs sm:text-sm">Check-in Reminders</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Daily wellness check-in prompts</p>
            </div>
            <Switch
              id="checkin-reminders"
              checked={preferences?.checkin_reminders ?? true}
              onCheckedChange={(checked) => updatePreference('checkin_reminders', checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="baseline-reminders" className="text-gray-700 text-xs sm:text-sm">Baseline Assessment</Label>
              <p className="text-gray-500 text-xs sm:text-sm">90-day assessment reminders</p>
            </div>
            <Switch
              id="baseline-reminders"
              checked={preferences?.baseline_reminders ?? true}
              onCheckedChange={(checked) => updatePreference('baseline_reminders', checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="wellness-alerts" className="text-gray-700 text-xs sm:text-sm">Wellness Alerts</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Important wellbeing updates</p>
            </div>
            <Switch
              id="wellness-alerts"
              checked={preferences?.wellness_alerts ?? true}
              onCheckedChange={(checked) => updatePreference('wellness_alerts', checked)}
              disabled={saving}
            />
          </div>
        </div>
      </Card>
      {/* Privacy & Security */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Privacy & Security</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="data-sharing" className="text-gray-700 text-xs sm:text-sm">Data Sharing</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Share anonymized data for research</p>
            </div>
            <Switch
              id="data-sharing"
              checked={preferences?.data_sharing ?? true}
              onCheckedChange={(checked) => updatePreference('data_sharing', checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="buddy-notifications" className="text-gray-700 text-xs sm:text-sm">Buddy Notifications</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Allow buddies to check in on you</p>
            </div>
            <Switch
              id="buddy-notifications"
              checked={preferences?.buddy_notifications ?? true}
              onCheckedChange={(checked) => updatePreference('buddy_notifications', checked)}
              disabled={saving}
            />
          </div>
          <div className="pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              className="w-full justify-start text-purple-600 hover:bg-purple-50 h-10 sm:h-12 text-sm sm:text-base"
              onClick={() => setShowPrivacy(true)}
            >
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Your Privacy
            </Button>
          </div>
        </div>
      </Card>
      {/* Appearance */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Appearance</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="dark-mode" className="text-gray-700 text-xs sm:text-sm">Dark Mode</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Use dark theme</p>
            </div>
            <Switch
              id="dark-mode"
              checked={preferences?.dark_mode ?? false}
              onCheckedChange={(checked) => updatePreference('dark_mode', checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="reduced-motion" className="text-gray-700 text-xs sm:text-sm">Reduced Motion</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Minimize animations</p>
            </div>
            <Switch
              id="reduced-motion"
              checked={preferences?.reduced_motion ?? false}
              onCheckedChange={(checked) => updatePreference('reduced_motion', checked)}
              disabled={saving}
            />
          </div>
        </div>
      </Card>
      {/* Assessment Preferences */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Assessment Preferences</h3>
        </div>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="voice-input" className="text-gray-700 text-xs sm:text-sm">Voice Input</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Use voice for check-ins</p>
            </div>
            <Switch
              id="voice-input"
              checked={preferences?.voice_input ?? true}
              onCheckedChange={(checked) => updatePreference('voice_input', checked)}
              disabled={saving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <Label htmlFor="text-input" className="text-gray-700 text-xs sm:text-sm">Text Input</Label>
              <p className="text-gray-500 text-xs sm:text-sm">Use text for check-ins</p>
            </div>
            <Switch
              id="text-input"
              checked={preferences?.text_input ?? true}
              onCheckedChange={(checked) => updatePreference('text_input', checked)}
              disabled={saving}
            />
          </div>
        </div>
      </Card>
      {/* Account Actions */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <Button
            variant="outline"
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-10 sm:h-12 text-sm sm:text-base"
            onClick={() => handleExternalLink('https://mindmeasure.co.uk/privacy')}
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Privacy Policy
            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="w-full border-gray-200 text-gray-700 hover:bg-gray-50 h-10 sm:h-12 text-sm sm:text-base"
            onClick={() => handleExternalLink('https://mindmeasure.co.uk/terms')}
          >
            <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Terms of Service
            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 h-10 sm:h-12 text-sm sm:text-base"
            onClick={handleSignOut}
          >
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </Card>
      {/* Bottom padding for navigation */}
      <div className="h-24" />

      <PrivacyOverlay isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}
