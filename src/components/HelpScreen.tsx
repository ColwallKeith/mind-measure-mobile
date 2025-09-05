import { Button } from './ui/button';
import { Card } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Phone, ExternalLink, Heart, MessageSquare, GraduationCap, Lightbulb, AlertTriangle, MapPin, Building2, Clock } from 'lucide-react';
import mindMeasureLogo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

export function HelpScreen() {
  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleVisit = (url: string) => {
    window.open(url, '_blank');
  };

  // Simulated user university detection based on email domain
  const userUniversity = 'University of Manchester'; // This would come from user's email domain
  const userLocation = 'Manchester';

  // Sample local resources based on detected university
  const localResources = [
    { 
      name: 'University of Manchester Counselling Service', 
      description: 'Free confidential counselling for all University of Manchester students', 
      phone: '0161 275 2864', 
      website: 'https://www.manchester.ac.uk/study/experience/student-support/counselling/',
      hours: 'Mon-Fri 9am-5pm'
    },
    { 
      name: 'University of Manchester Student Support', 
      description: '24/7 emergency support line for UoM students', 
      phone: '0161 275 2900', 
      website: 'https://www.manchester.ac.uk/study/experience/student-support/',
      hours: '24/7'
    },
    { 
      name: '42nd Street Manchester', 
      description: 'Free and confidential support for young people under 25 in Greater Manchester', 
      phone: '0161 832 0170', 
      website: 'https://www.42ndstreet.org.uk/',
      hours: 'Mon-Fri 10am-6pm'
    }
  ];

  return (
    <div className="px-6 py-8 space-y-6">
      {/* Header */}
      <div className="pt-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img 
            src={mindMeasureLogo} 
            alt="Mind Measure" 
            className="w-full h-full object-contain opacity-80"
          />
        </div>
        <h1 className="text-gray-900 mb-2">Find mental health support</h1>
        <p className="text-gray-600 text-sm">Personalised support resources for the UK</p>
      </div>

      {/* Urgent Help - Always Visible */}
      <Card className="border-2 border-red-200 shadow-lg backdrop-blur-xl bg-red-50/80 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-red-900 mb-1">If you need urgent help</h3>
            <p className="text-red-700 text-sm">If you or someone else is in immediate danger, call 999</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/60 rounded-xl backdrop-blur-sm">
            <h4 className="text-red-900 mb-2">Emergency services (UK)</h4>
            <p className="text-red-700 text-sm mb-3">If you or someone else is in immediate danger, call 999.</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleVisit('https://www.samaritans.org/how-we-can-help/contact-samaritans/')}
                className="bg-red-500 hover:bg-red-600 text-white h-10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Crisis Chat
              </Button>
              <Button 
                onClick={() => handleCall('999')}
                className="bg-red-600 hover:bg-red-700 text-white h-10"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 999
              </Button>
            </div>
          </div>

          <div className="p-4 bg-white/60 rounded-xl backdrop-blur-sm">
            <h4 className="text-red-900 mb-2">NHS First Response Service</h4>
            <p className="text-red-700 text-sm mb-3">Immediate mental health crisis support - available 24/7.</p>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleVisit('https://111.nhs.uk/service/mental-health/')}
                className="bg-red-500 hover:bg-red-600 text-white h-10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                NHS 111 Online
              </Button>
              <Button 
                onClick={() => handleCall('111')}
                className="bg-red-600 hover:bg-red-700 text-white h-10"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call 111
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Local Student Support Section */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-indigo-900">Your local student support</h3>
            <p className="text-indigo-700 text-sm">Resources specific to your university</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-indigo-50/60 rounded-lg backdrop-blur-sm border border-indigo-200">
            <p className="text-indigo-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Detected: {userUniversity}
            </p>
            <p className="text-indigo-600 text-xs mt-1">Based on your university email address</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-indigo-900">Your local support services:</h4>
            {localResources.map((resource, index) => (
              <div key={index} className="p-4 bg-indigo-50/60 rounded-xl backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="text-indigo-900 mb-1">{resource.name}</h5>
                    <p className="text-indigo-700 text-sm mb-2">{resource.description}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span className="text-indigo-600 text-xs">{resource.hours}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleVisit(resource.website)}
                        variant="outline"
                        className="bg-white/60 border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-9"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Visit
                      </Button>
                      {resource.phone && (
                        <Button 
                          onClick={() => handleCall(resource.phone)}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white h-9"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Support Services Accordion */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
        <h3 className="text-gray-900 mb-4">National UK support</h3>
        
        <Accordion type="multiple" className="space-y-3">
          <AccordionItem value="samaritans" className="border-0 bg-blue-50/60 rounded-xl backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-blue-900">Samaritans</h4>
                  <p className="text-blue-700 text-sm">24/7 confidential emotional support</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-blue-700 text-sm mb-3">24/7 confidential emotional support via phone or webchat.</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleVisit('https://www.samaritans.org/')}
                  variant="outline" 
                  className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-50 h-9"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit
                </Button>
                <Button 
                  onClick={() => handleCall('116123')}
                  className="bg-blue-500 hover:bg-blue-600 text-white h-9"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call 116 123
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shout" className="border-0 bg-purple-50/60 rounded-xl backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-purple-900">Shout</h4>
                  <p className="text-purple-700 text-sm">24/7 text support</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-purple-700 text-sm mb-3">24/7 text support. Text SHOUT to 85258.</p>
              <Button 
                onClick={() => handleVisit('https://giveusashout.org/')}
                variant="outline" 
                className="bg-white/60 border-purple-200 text-purple-700 hover:bg-purple-50 h-9"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mind" className="border-0 bg-green-50/60 rounded-xl backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-green-900">Mind</h4>
                  <p className="text-green-700 text-sm">Information and support for mental health</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-green-700 text-sm mb-3">Information and support for mental health.</p>
              <Button 
                onClick={() => handleVisit('https://www.mind.org.uk/')}
                variant="outline" 
                className="bg-white/60 border-green-200 text-green-700 hover:bg-green-50 h-9"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="student-space" className="border-0 bg-amber-50/60 rounded-xl backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-amber-900">Student Space (Student Minds)</h4>
                  <p className="text-amber-700 text-sm">Support for students</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-amber-700 text-sm mb-3">Support for students via webchat, text and resources.</p>
              <Button 
                onClick={() => handleVisit('https://studentspace.org.uk/')}
                variant="outline" 
                className="bg-white/60 border-amber-200 text-amber-700 hover:bg-amber-50 h-9"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Visit
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="papyrus" className="border-0 bg-rose-50/60 rounded-xl backdrop-blur-sm">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500/20 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-rose-600" />
                </div>
                <div className="text-left">
                  <h4 className="text-rose-900">Papyrus HOPELINE247</h4>
                  <p className="text-rose-700 text-sm">Support for people under 35</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <p className="text-rose-700 text-sm mb-3">Confidential support for people under 35 experiencing suicidal thoughts.</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleVisit('https://www.papyrus-uk.org/')}
                  variant="outline" 
                  className="bg-white/60 border-rose-200 text-rose-700 hover:bg-rose-50 h-9"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit
                </Button>
                <Button 
                  onClick={() => handleCall('08006844141')}
                  className="bg-rose-500 hover:bg-rose-600 text-white h-9"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call 0800 068 4141
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      {/* Footer Note */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-gray-50/70 p-4">
        <p className="text-gray-600 text-sm text-center">
          If you are outside the UK, please use local emergency numbers and services in your country.
        </p>
      </Card>

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}