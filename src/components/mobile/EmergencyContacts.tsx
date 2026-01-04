import { useState, useEffect } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Phone,
  Clock,
  AlertTriangle,
  Heart,
  Shield,
  Stethoscope,
  Users,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { getEmergencyContacts } from "../../features/mobile/data";
import { EmergencyContact } from "../../features/cms/data";
interface EmergencyContactsProps {
  onCall?: (contact: EmergencyContact) => void;
}
export function EmergencyContacts({ onCall }: EmergencyContactsProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadContacts();
  }, []);
  const loadContacts = async () => {
    setLoading(true);
    try {
      const contactsData = await getEmergencyContacts();
      setContacts(contactsData);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
    } finally {
      setLoading(false);
    }
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'crisis': return <AlertTriangle className="w-5 h-5" />;
      case 'medical': return <Stethoscope className="w-5 h-5" />;
      case 'security': return <Shield className="w-5 h-5" />;
      case 'mental-health': return <Heart className="w-5 h-5" />;
      case 'support': return <Users className="w-5 h-5" />;
      default: return <Phone className="w-5 h-5" />;
    }
  };
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'crisis': return 'text-red-600 bg-red-100';
      case 'medical': return 'text-blue-600 bg-blue-100';
      case 'security': return 'text-orange-600 bg-orange-100';
      case 'mental-health': return 'text-purple-600 bg-purple-100';
      case 'support': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  const handleCall = (contact: EmergencyContact) => {
    // Clean phone number for calling
    const cleanPhone = contact.phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
    if (onCall) {
      onCall(contact);
    }
  };
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading emergency contacts...</p>
        </div>
      </div>
    );
  }
  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Emergency Contacts</h3>
          <p className="text-muted-foreground">
            Emergency contacts haven't been set up for your university yet.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
        <h2 className="text-xl font-bold">Emergency Support</h2>
        <p className="text-sm text-muted-foreground">
          Immediate help when you need it most
        </p>
      </div>
      {/* Primary/Crisis Contacts First */}
      {contacts
        .filter(contact => contact.isPrimary || contact.category === 'crisis')
        .map((contact) => (
          <Card key={contact.id} className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getCategoryColor(contact.category)}`}>
                    {getCategoryIcon(contact.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold">{contact.name}</h3>
                      {contact.isPrimary && (
                        <Badge className="bg-red-100 text-red-800 text-xs">Primary</Badge>
                      )}
                      {contact.is24Hour && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          24/7
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-mono text-red-700 mb-1">{contact.phone}</p>
                    <p className="text-sm text-red-600">{contact.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleCall(contact)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      {/* Other Contacts */}
      {contacts
        .filter(contact => !contact.isPrimary && contact.category !== 'crisis')
        .map((contact) => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(contact.category)}`}>
                    {getCategoryIcon(contact.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium">{contact.name}</h3>
                      {contact.is24Hour && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          24/7
                        </Badge>
                      )}
                      <Badge className="bg-gray-100 text-gray-800 text-xs">
                        {contact.category.replace('-', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm font-mono text-blue-600 mb-1">{contact.phone}</p>
                    <p className="text-xs text-muted-foreground">{contact.description}</p>
                  </div>
                </div>
                <Button
                  onClick={() => handleCall(contact)}
                  variant="outline"
                  size="sm"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      {/* Footer */}
      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          In a life-threatening emergency, always call 999 (UK) or your local emergency number
        </p>
      </div>
    </div>
  );
}
