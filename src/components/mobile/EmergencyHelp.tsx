import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Phone, MessageCircle, Shield, AlertTriangle, Heart } from 'lucide-react';
interface EmergencyHelpProps {
  onBack: () => void;
}
export const EmergencyHelp: React.FC<EmergencyHelpProps> = ({ onBack }) => {
  const emergencyContacts = [
    {
      name: 'Crisis Helpline',
      number: '988',
      description: '24/7 Suicide & Crisis Lifeline',
      priority: 'high',
      icon: AlertTriangle
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      description: 'Text HOME to connect with a counselor',
      priority: 'high',
      icon: MessageCircle
    },
    {
      name: 'University Counseling',
      number: '+1-555-0123',
      description: 'Worcester University Mental Health Services',
      priority: 'medium',
      icon: Heart
    },
    {
      name: 'Campus Security',
      number: '+1-555-0124',
      description: '24/7 Campus Safety & Emergency Response',
      priority: 'medium',
      icon: Shield
    }
  ];
  const handleCall = (number: string) => {
    window.open(`tel:${number}`, '_self');
  };
  const handleText = (number: string) => {
    window.open(`sms:${number}`, '_self');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-red-200/20 to-orange-200/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-12 w-96 h-96 bg-gradient-to-br from-yellow-200/15 to-red-200/10 rounded-full blur-3xl"></div>
      </div>
      {/* Main Content */}
      <div className="relative z-10 p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4 pt-6">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="p-2 hover:bg-white/50 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergency Help</h1>
            <p className="text-gray-600 text-sm">You're not alone. Help is available 24/7.</p>
          </div>
        </div>
        {/* Crisis Alert */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
          <div className="text-center space-y-3">
            <AlertTriangle className="w-12 h-12 mx-auto" />
            <h2 className="text-xl font-bold">Need Immediate Help?</h2>
            <p className="text-red-100">
              If you're in crisis or having thoughts of self-harm, please call or text one of the numbers below immediately.
            </p>
          </div>
        </Card>
        {/* Emergency Contacts */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Emergency Contacts</h3>
          {emergencyContacts.map((contact, index) => {
            const Icon = contact.icon;
            const isHighPriority = contact.priority === 'high';
            return (
              <Card
                key={index}
                className={`border-0 shadow-lg backdrop-blur-xl ${
                  isHighPriority
                    ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500'
                    : 'bg-white/90'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isHighPriority
                          ? 'bg-gradient-to-r from-red-500 to-orange-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{contact.name}</h4>
                        <p className="text-sm text-gray-600">{contact.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleCall(contact.number)}
                        size="sm"
                        className={`${
                          isHighPriority
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                      {contact.name.includes('Text') && (
                        <Button
                          onClick={() => handleText(contact.number)}
                          size="sm"
                          variant="outline"
                          className="border-gray-300 text-gray-700"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Text
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {/* Additional Resources */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/90 p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Resources</h3>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Heart className="w-5 h-5 text-pink-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Self-Care Techniques</p>
                    <p className="text-sm text-gray-600">Breathing exercises and grounding techniques</p>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Campus Safety</p>
                    <p className="text-sm text-gray-600">Emergency procedures and safety tips</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </Card>
        {/* Important Notice */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/80 p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-blue-800">
              <strong>Remember:</strong> Your mental health matters. Don't hesitate to reach out for help.
            </p>
            <p className="text-xs text-blue-700">
              All conversations are confidential and protected by privacy laws.
            </p>
          </div>
        </Card>
        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </div>
  );
};
