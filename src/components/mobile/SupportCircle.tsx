import { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { BuddyCard } from './BuddyCard';
import { AddBuddyModal } from './AddBuddyModal';
import { BackendServiceFactory } from '@/services/database/BackendServiceFactory';
import { useAuth } from '@/contexts/AuthContext';

interface Buddy {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  rank: number;
}

interface SupportCircleProps {
  onNavigateToHelp?: () => void;
}

export function SupportCircle({ onNavigateToHelp }: SupportCircleProps) {
  const { user } = useAuth();
  const backendService = BackendServiceFactory.createService();
  
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load buddies from database
  useEffect(() => {
    loadBuddies();
  }, [user]);

  const loadBuddies = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      console.log('📞 Loading buddies for user:', user.id);
      
      const response = await backendService.databaseService.select({
        table: 'buddy_contacts',
        columns: ['id', 'name', 'phone', 'email', 'relationship', 'notify_channel'],
        filters: {
          user_id: user.id,
          is_active: true
        },
        orderBy: { column: 'created_at', ascending: true }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Map database records to Buddy interface and assign ranks
      const loadedBuddies: Buddy[] = (response.data || []).map((buddy: any, index: number) => ({
        id: buddy.id,
        name: buddy.name,
        phone: buddy.phone,
        email: buddy.email || '',
        relationship: buddy.relationship || '',
        rank: index + 1
      }));

      console.log('✅ Loaded buddies:', loadedBuddies);
      setBuddies(loadedBuddies);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading buddies:', err);
      setError('Failed to load support circle');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuddy = async (newBuddy: { name: string; phone: string; email: string; relationship: string }) => {
    if (!user?.id) return;
    
    try {
      console.log('➕ Adding new buddy:', newBuddy);
      
      const response = await backendService.databaseService.insert({
        table: 'buddy_contacts',
        data: {
          user_id: user.id,
          name: newBuddy.name,
          phone: newBuddy.phone,
          email: newBuddy.email || null,
          relationship: newBuddy.relationship || null,
          notify_channel: 'sms', // Default to SMS
          is_active: true,
          verified: false
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log('✅ Buddy added successfully');
      
      // Reload buddies from database to get correct IDs and order
      await loadBuddies();
    } catch (err) {
      console.error('❌ Error adding buddy:', err);
      alert('Failed to add buddy. Please try again.');
    }
  };

  const handleDeleteBuddy = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this buddy?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting buddy:', id);
      
      // Soft delete by setting is_active to false
      const response = await backendService.databaseService.update({
        table: 'buddy_contacts',
        data: {
          is_active: false
        },
        filters: {
          id: id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log('✅ Buddy deleted successfully');
      
      // Remove from local state and reorder ranks
      const newBuddies = buddies.filter(b => b.id !== id);
      const rerankedBuddies = newBuddies.map((b, index) => ({
        ...b,
        rank: index + 1
      }));
      setBuddies(rerankedBuddies);
    } catch (err) {
      console.error('❌ Error deleting buddy:', err);
      alert('Failed to delete buddy. Please try again.');
    }
  };

  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    setBuddies((prevBuddies) => {
      const newBuddies = [...prevBuddies];
      const [draggedBuddy] = newBuddies.splice(dragIndex, 1);
      newBuddies.splice(hoverIndex, 0, draggedBuddy);
      
      // Update ranks based on new order
      return newBuddies.map((buddy, index) => ({
        ...buddy,
        rank: index + 1
      }));
    });
  }, []);

  const handleAskCheckIn = async (id: string) => {
    const buddy = buddies.find(b => b.id === id);
    if (!buddy) return;

    try {
      console.log('📞 Sending check-in request to:', buddy.name);
      
      // TODO: Implement actual SMS/notification service
      // For now, just show a confirmation
      alert(`Check-in request will be sent to ${buddy.name} at ${buddy.phone}`);
      
      // In production, this would call an API endpoint like:
      // await backendService.sendBuddyCheckIn(id);
    } catch (err) {
      console.error('❌ Error sending check-in request:', err);
      alert('Failed to send check-in request. Please try again.');
    }
  };

  const handleEmergencyHelp = () => {
    if (onNavigateToHelp) {
      onNavigateToHelp();
    } else {
      // Fallback if navigation not provided
      console.log('Navigate to emergency resources');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E2E8F0',
            borderTopColor: '#5B8FED',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <p style={{ color: '#64748B', fontSize: '14px' }}>Loading your support circle...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F5F5F5'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '20px',
          borderBottom: '1px solid #F0F0F0'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '600', 
                color: '#0F172A',
                margin: '0 0 8px 0'
              }}>
                Support Circle
              </h1>
              <div style={{
                display: 'inline-block',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {buddies.length}/5 Buddies
              </div>
            </div>
            
            {/* Help Icon */}
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: showInfo ? '#5B8FED' : '#F1F5F9',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showInfo ? 'white' : '#64748B',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              aria-label="Toggle information"
            >
              ?
            </button>
          </div>
        </div>

        {/* Collapsible Info Section */}
        {showInfo && (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '16px',
            padding: '20px',
            margin: '16px 16px 0 16px'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#1E40AF', 
              margin: '0 0 12px 0'
            }}>
              What is Support Circle?
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: '#1E40AF', 
              margin: '0 0 12px 0', 
              lineHeight: '1.5'
            }}>
              Your Support Circle is a trusted group of people who can help during difficult times. Add up to 5 buddies you can reach out to when you need support.
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: '#1E40AF', 
              margin: 0, 
              lineHeight: '1.5',
              fontWeight: '600'
            }}>
              With your permission, we can also contact your buddies if we detect concerning wellbeing scores.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '16px',
            margin: '16px',
            color: '#DC2626',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Main Content */}
        <div style={{ padding: '20px 16px', maxWidth: '768px', margin: '0 auto' }}>
          {/* Empty State */}
          {buddies.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
              border: '1px solid #F0F0F0'
            }}>
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '600', 
                color: '#0F172A', 
                margin: '0 0 8px 0'
              }}>
                Build Your Support Circle
              </h2>
              <p style={{ 
                fontSize: '15px', 
                color: '#64748B', 
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}>
                Start by adding your first trusted buddy.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '14px 32px',
                  backgroundColor: '#5B8FED',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4A7FDC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#5B8FED';
                }}
              >
                Add Your First Buddy
              </button>
            </div>
          ) : (
            <>
              {/* Drag to Reorder Hint */}
              <div style={{
                fontSize: '13px',
                color: '#64748B',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                Drag to reorder priority
              </div>

              {/* Buddy Cards */}
              <div style={{ marginBottom: '20px' }}>
                {buddies.slice(0, 2).map((buddy, index) => (
                  <BuddyCard
                    key={buddy.id}
                    buddy={buddy}
                    index={index}
                    onDelete={handleDeleteBuddy}
                    onMove={moveCard}
                    onAskCheckIn={handleAskCheckIn}
                  />
                ))}
              </div>

              {/* Add Buddy Button */}
              {buddies.length < 5 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    width: '320px',
                    padding: '16px 24px',
                    backgroundColor: '#5B8FED',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'white',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    margin: '0 auto 16px auto',
                    display: 'block',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4A7FDC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#5B8FED';
                  }}
                >
                  Add Buddy
                </button>
              )}

              {/* Emergency Resources Button */}
              <button
                onClick={handleEmergencyHelp}
                style={{
                  width: '320px',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  margin: '0 auto 20px auto',
                  display: 'block',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Need Help?
              </button>

              {/* Remaining Buddy Cards */}
              {buddies.length > 2 && (
                <div>
                  {buddies.slice(2).map((buddy, index) => (
                    <BuddyCard
                      key={buddy.id}
                      buddy={buddy}
                      index={index + 2}
                      onDelete={handleDeleteBuddy}
                      onMove={moveCard}
                      onAskCheckIn={handleAskCheckIn}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Buddy Modal */}
        <AddBuddyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddBuddy}
          currentBuddyCount={buddies.length}
        />
        
        {/* Bottom padding for navigation */}
        <div style={{ height: '80px' }} />
      </div>
      
      {/* Add keyframe animation for loading spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </DndProvider>
  );
}

