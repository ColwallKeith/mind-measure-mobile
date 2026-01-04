import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Shield, Eye, Lock, FileText, Users, Globe } from 'lucide-react';
interface PrivacyTermsProps {
  onBack: () => void;
}
export const PrivacyTerms: React.FC<PrivacyTermsProps> = ({ onBack }) => {
  const sections = [
    {
      title: 'Privacy Policy',
      icon: Eye,
      color: 'from-blue-500 to-indigo-500',
      content: [
        'Your personal data is collected and processed in accordance with GDPR and UK data protection laws.',
        'We collect only the information necessary to provide our mental health assessment services.',
        'Your conversations with Jodie are encrypted and stored securely.',
        'Data is anonymized for research purposes to help improve university mental health services.',
        'You have the right to access, modify, or delete your personal data at any time.'
      ]
    },
    {
      title: 'Data Security',
      icon: Lock,
      color: 'from-green-500 to-emerald-500',
      content: [
        'All data transmission is encrypted using industry-standard SSL/TLS protocols.',
        'Your information is stored on secure servers with multiple layers of protection.',
        'Access to your data is strictly limited to authorized personnel only.',
        'Regular security audits and penetration testing are conducted.',
        'We maintain compliance with ISO 27001 security standards.'
      ]
    },
    {
      title: 'Terms of Service',
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      content: [
        'Mind Measure is designed for educational and wellness purposes only.',
        'Our AI assessments are not a substitute for professional medical advice.',
        'You must be 18+ or have parental consent to use this service.',
        'University email addresses are required for registration and access.',
        'Misuse of the platform may result in account suspension.'
      ]
    },
    {
      title: 'University Partnership',
      icon: Users,
      color: 'from-orange-500 to-red-500',
      content: [
        'Your university covers the cost of Mind Measure services.',
        'Anonymized data helps universities understand student mental health trends.',
        'University counselors may access your data with your explicit consent.',
        'Your institution receives aggregate reports, never individual data.',
        'University-specific resources are tailored to your campus services.'
      ]
    }
  ];
  const handleContactPrivacy = () => {
    window.open('mailto:privacy@mindmeasure.app', '_blank');
  };
  const handleContactLegal = () => {
    window.open('mailto:legal@mindmeasure.app', '_blank');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-32 left-12 w-96 h-96 bg-gradient-to-br from-purple-200/15 to-pink-200/10 rounded-full blur-3xl"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Privacy & Terms</h1>
            <p className="text-gray-600 text-sm">Your rights and our commitments</p>
          </div>
        </div>
        {/* Important Notice */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6">
          <div className="text-center space-y-3">
            <Shield className="w-12 h-12 mx-auto" />
            <h2 className="text-xl font-bold">Your Privacy Matters</h2>
            <p className="text-blue-100">
              We're committed to protecting your personal information and ensuring transparency about how we use your data.
            </p>
          </div>
        </Card>
        {/* Policy Sections */}
        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card
                key={index}
                className="border-0 shadow-lg backdrop-blur-xl bg-white/90 hover:shadow-xl transition-shadow duration-200"
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${section.color} rounded-full flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <div className="space-y-3">
                      {section.content.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 bg-gradient-to-r ${section.color} rounded-full mt-2 flex-shrink-0`}></div>
                          <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {/* Contact Information */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/90 p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Questions or Concerns?</h3>
            <p className="text-gray-600 text-sm">
              If you have any questions about our privacy practices or terms of service, please don't hesitate to contact us.
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={handleContactPrivacy}
                variant="outline"
                className="justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Privacy Questions</p>
                    <p className="text-sm text-gray-600">privacy@mindmeasure.app</p>
                  </div>
                </div>
              </Button>
              <Button
                onClick={handleContactLegal}
                variant="outline"
                className="justify-start h-auto p-4 border-gray-200 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Legal Inquiries</p>
                    <p className="text-sm text-gray-600">legal@mindmeasure.app</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </Card>
        {/* Full Policy Links */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="text-center space-y-4">
            <Globe className="w-12 h-12 mx-auto" />
            <h3 className="text-xl font-bold">Complete Policies</h3>
            <p className="text-purple-100">
              Read our full privacy policy and terms of service on our website.
            </p>
            <Button
              onClick={() => window.open('https://mindmeasure.app/privacy', '_blank')}
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              View Full Policies
            </Button>
          </div>
        </Card>
        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </div>
  );
};
