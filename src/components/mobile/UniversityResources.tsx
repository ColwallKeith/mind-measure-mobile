import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, GraduationCap, Heart, BookOpen, Users, Shield, Phone, Globe, MapPin } from 'lucide-react';
interface UniversityResourcesProps {
  onBack: () => void;
}
export const UniversityResources: React.FC<UniversityResourcesProps> = ({ onBack }) => {
  const universityInfo = {
    name: 'University of Worcester',
    logo: 'https://api.mindmeasure.co.uk/storage/marketing/MM%20logo%20square.png',
    location: 'Worcester, UK',
    website: 'https://worcester.ac.uk'
  };
  const resourceCategories = [
    {
      title: 'Mental Health Services',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      resources: [
        { name: 'Student Counseling Center', description: 'Free confidential counseling services', contact: '+44 1905 855000', type: 'phone' },
        { name: 'Crisis Support Line', description: '24/7 mental health crisis support', contact: '+44 1905 855111', type: 'phone' },
        { name: 'Wellness Workshops', description: 'Mindfulness, stress management, and resilience training', contact: 'wellness@worcester.ac.uk', type: 'email' }
      ]
    },
    {
      title: 'Academic Support',
      icon: BookOpen,
      color: 'from-blue-500 to-indigo-500',
      resources: [
        { name: 'Learning Support Services', description: 'Academic accommodations and study skills', contact: '+44 1905 855222', type: 'phone' },
        { name: 'Writing Center', description: 'Essay and assignment writing support', contact: 'writing@worcester.ac.uk', type: 'email' },
        { name: 'Math & Science Tutoring', description: 'Subject-specific academic assistance', contact: 'tutoring@worcester.ac.uk', type: 'email' }
      ]
    },
    {
      title: 'Student Life & Community',
      icon: Users,
      color: 'from-green-500 to-emerald-500',
      resources: [
        { name: 'Student Union', description: 'Student representation and social activities', contact: 'union@worcester.ac.uk', type: 'email' },
        { name: 'International Student Office', description: 'Support for international students', contact: '+44 1905 855333', type: 'phone' },
        { name: 'Disability Services', description: 'Accessibility and accommodation support', contact: 'disability@worcester.ac.uk', type: 'email' }
      ]
    },
    {
      title: 'Health & Safety',
      icon: Shield,
      color: 'from-purple-500 to-violet-500',
      resources: [
        { name: 'Student Health Center', description: 'Primary healthcare and medical services', contact: '+44 1905 855444', type: 'phone' },
        { name: 'Campus Security', description: '24/7 safety and emergency response', contact: '+44 1905 855555', type: 'phone' },
        { name: 'Title IX Office', description: 'Gender-based discrimination and harassment support', contact: 'titleix@worcester.ac.uk', type: 'email' }
      ]
    }
  ];
  const handleContact = (contact: string, type: string) => {
    if (type === 'phone') {
      window.open(`tel:${contact}`, '_self');
    } else if (type === 'email') {
      window.open(`mailto:${contact}`, '_self');
    }
  };
  const handleWebsite = () => {
    window.open(universityInfo.website, '_blank');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
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
            <h1 className="text-2xl font-bold text-gray-900">University Resources</h1>
            <p className="text-gray-600 text-sm">Your institution's support services</p>
          </div>
        </div>
        {/* University Header */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/90 p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden">
              <img
                src={universityInfo.logo}
                alt={universityInfo.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{universityInfo.name}</h2>
              <div className="flex items-center space-x-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4" />
                <span>{universityInfo.location}</span>
              </div>
            </div>
            <Button
              onClick={handleWebsite}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <Globe className="w-4 h-4 mr-1" />
              Visit
            </Button>
          </div>
        </Card>
        {/* Resource Categories */}
        <div className="space-y-6">
          {resourceCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.title}</h3>
                </div>
                <div className="space-y-3">
                  {category.resources.map((resource, resourceIndex) => (
                    <Card
                      key={resourceIndex}
                      className="border-0 shadow-lg backdrop-blur-xl bg-white/90 hover:shadow-xl transition-shadow duration-200"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{resource.name}</h4>
                            <p className="text-sm text-gray-600">{resource.description}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              {resource.type === 'phone' ? (
                                <Phone className="w-4 h-4" />
                              ) : (
                                <Globe className="w-4 h-4" />
                              )}
                              <span>{resource.contact}</span>
                            </div>
                            <Button
                              onClick={() => handleContact(resource.contact, resource.type)}
                              size="sm"
                              className={`bg-gradient-to-r ${category.color} text-white hover:shadow-lg transition-all duration-200`}
                            >
                              {resource.type === 'phone' ? 'Call' : 'Email'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {/* Quick Actions */}
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6">
          <div className="text-center space-y-4">
            <GraduationCap className="w-12 h-12 mx-auto" />
            <h3 className="text-xl font-bold">Need Something Else?</h3>
            <p className="text-purple-100">
              Can't find what you're looking for? Contact the Student Services Hub for personalized assistance.
            </p>
            <Button
              onClick={() => handleContact('+44 1905 855000', 'phone')}
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Phone className="w-4 h-4 mr-2" />
              Contact Student Services
            </Button>
          </div>
        </Card>
        {/* Bottom spacing */}
        <div className="h-24" />
      </div>
    </div>
  );
};
