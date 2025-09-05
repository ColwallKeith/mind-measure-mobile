import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Users, UserPlus, Phone, Mail, Heart, Shield, CheckCircle, Clock, MessageCircle, Plus, Trash2, Send } from 'lucide-react';
import mindMeasureLogo from 'figma:asset/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

interface SupportBuddy {
  id: string;
  name: string;
  email: string;
  phone: string;
  relationship?: string;
  status: 'active' | 'invited' | 'inactive';
  dateAdded: string;
  avatarColor: string;
}

export function BuddyScreen() {
  const [buddies, setBuddies] = useState<SupportBuddy[]>([
    {
      id: '1',
      name: 'Keith Duddy',
      email: 'keith@rude.health',
      phone: '+447521457477',
      relationship: 'Partner',
      status: 'active',
      dateAdded: '2024-01-15',
      avatarColor: 'bg-gradient-to-br from-blue-400 to-purple-500'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: ''
  });

  const handleAddBuddy = () => {
    if (formData.name && formData.email && formData.phone) {
      const colors = [
        'bg-gradient-to-br from-pink-400 to-rose-500',
        'bg-gradient-to-br from-green-400 to-emerald-500',
        'bg-gradient-to-br from-orange-400 to-amber-500',
        'bg-gradient-to-br from-indigo-400 to-blue-500'
      ];
      
      const newBuddy: SupportBuddy = {
        id: Date.now().toString(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        relationship: formData.relationship || undefined,
        status: 'invited',
        dateAdded: new Date().toISOString().split('T')[0],
        avatarColor: colors[Math.floor(Math.random() * colors.length)]
      };
      
      setBuddies([...buddies, newBuddy]);
      setFormData({ name: '', email: '', phone: '', relationship: '' });
      setShowAddForm(false);
    }
  };

  const handleDeleteBuddy = (id: string) => {
    setBuddies(buddies.filter(buddy => buddy.id !== id));
  };

  const handleRequestCheckIn = (buddy: SupportBuddy) => {
    // In a real app, this would send a gentle check-in request
    console.log('Requesting check-in from:', buddy.name);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'text-green-600', bg: 'bg-green-500/20', label: 'Active', icon: CheckCircle };
      case 'invited':
        return { color: 'text-blue-600', bg: 'bg-blue-500/20', label: 'Invited', icon: Clock };
      case 'inactive':
        return { color: 'text-gray-600', bg: 'bg-gray-500/20', label: 'Inactive', icon: Clock };
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-500/20', label: 'Unknown', icon: Clock };
    }
  };

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
        <h1 className="text-gray-900 mb-2">Your Support Circle</h1>
        <p className="text-gray-600 text-sm">People who check in when you need them</p>
      </div>



      {/* How It Works */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-blue-50/70 p-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-blue-900 mb-2">When your buddies reach out</h3>
            <p className="text-blue-700 text-sm mb-3">
              When your wellness scores show you're having a tough time, we'll gently ask your support circle to check in with you. They might send a text, give you a call, or suggest meeting up.
            </p>
            <div className="text-blue-600 text-sm space-y-1">
              <div>• When you're feeling low but safe</div>
              <div>• During stressful periods</div>
              <div>• When you might need a friend</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Support Circle List */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900 mb-1">Your Support Circle ({buddies.length}/2)</h3>
            <p className="text-gray-600 text-sm">People who care about your wellbeing</p>
          </div>
          {buddies.length < 2 && (
            <Button 
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-10"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Buddy
            </Button>
          )}
        </div>

        <div className="space-y-4">
          {buddies.map((buddy) => {
            const statusInfo = getStatusInfo(buddy.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={buddy.id} className="group relative">
                {/* Active glow for active buddies */}
                {buddy.status === 'active' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                )}
                
                <div className="relative p-5 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 group-hover:bg-white/90 transition-all duration-300 group-hover:scale-[1.02]">
                  <div className="flex items-start gap-4">
                    {/* Avatar with Initials */}
                    <div className="relative">
                      <div className={`w-16 h-16 ${buddy.avatarColor} rounded-full flex items-center justify-center text-white shadow-lg`}>
                        <div className="text-lg font-semibold">
                          {buddy.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      {buddy.status === 'active' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="text-gray-900 font-medium">{buddy.name}</h4>
                        <Badge className={`${statusInfo.bg} ${statusInfo.color} border-0 text-xs`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      
                      {buddy.relationship && (
                        <p className="text-gray-600 text-sm mb-3">{buddy.relationship}</p>
                      )}

                      {/* Contact Details */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Phone className="w-4 h-4" />
                          <span className="truncate">{buddy.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{buddy.email}</span>
                        </div>
                      </div>

                      {buddy.status === 'invited' && (
                        <div className="p-2 bg-blue-50/60 rounded-lg border border-blue-200">
                          <p className="text-blue-700 text-sm">
                            Invitation sent • They'll get a message explaining how to support you
                          </p>
                        </div>
                      )}

                      {buddy.status === 'active' && (
                        <div className="mt-3">
                          <Button 
                            size="sm"
                            onClick={() => handleRequestCheckIn(buddy)}
                            className="bg-purple-500 hover:bg-purple-600 text-white h-8 px-3"
                          >
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Ask for check-in
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete button positioned at bottom right */}
                  <div className="absolute bottom-3 right-3">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteBuddy(buddy.id)}
                      className="bg-white/60 border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {buddies.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100 rounded-full">
                <Users className="w-10 h-10 text-purple-500" />
              </div>
              <h4 className="text-gray-900 mb-2">Build your support circle</h4>
              <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                Add close friends or family who can check in when you're going through a tough time
              </p>
              <Button 
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Buddy
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Add New Buddy Form */}
      {showAddForm && (
        <Card className="border-0 shadow-lg backdrop-blur-xl bg-white/70 p-6 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-gray-900">Add Support Buddy</h3>
              <p className="text-gray-600 text-sm">Someone who can check in when you need support</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="name" className="text-gray-700">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="bg-white/60 border-gray-200"
                />
              </div>
              <div>
                <Label htmlFor="relationship" className="text-gray-700">Relationship</Label>
                <Input
                  id="relationship"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="e.g., Sister, Best Friend"
                  className="bg-white/60 border-gray-200"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-700">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+447911123456"
                className="bg-white/60 border-gray-200"
              />
              <p className="text-gray-500 text-xs mt-1">We'll ask them to check in when you're feeling low</p>
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-700">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                className="bg-white/60 border-gray-200"
              />
              <p className="text-gray-500 text-xs mt-1">They'll receive an invitation to join your support circle</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                onClick={handleAddBuddy}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white flex-1"
                disabled={!formData.name || !formData.email || !formData.phone}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
              <Button 
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="bg-white/60 border-gray-200 text-gray-700 hover:bg-gray-50 flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Privacy Note */}
      <Card className="border-0 shadow-lg backdrop-blur-xl bg-gray-50/70 p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-700 text-sm">
              <span className="font-medium">Your buddies are for gentle support.</span> We'll only ask them to check in when your wellness scores suggest you could use some caring attention. For crisis support, we'll connect you directly with professional services.
            </p>
          </div>
        </div>
      </Card>

      {/* Bottom padding for navigation */}
      <div className="h-24" />
    </div>
  );
}