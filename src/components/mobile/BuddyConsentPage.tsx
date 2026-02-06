import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import logo from '@/assets/66710e04a85d98ebe33850197f8ef41bd28d8b84.png';

type PageView = 'loading' | 'consent' | 'accepted' | 'declined' | 'error';

interface InviteData {
  inviterName: string;
  inviteeName: string;
}

export function BuddyConsentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState<PageView>('loading');
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  // Fetch invite data on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setCurrentPage('error');
      return;
    }

    // For now, we'll fetch the invite data from the API
    // The API endpoint should validate the token and return inviter/invitee names
    fetchInviteData(token);
  }, [token]);

  const fetchInviteData = async (token: string) => {
    try {
      const response = await fetch('/api/buddies/invite/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid or expired invitation');
      }

      const data = await response.json();
      setInviteData({
        inviterName: data.inviterName || 'Someone',
        inviteeName: data.inviteeName || 'there',
      });
      setCurrentPage('consent');
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation');
      setCurrentPage('error');
    }
  };

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/buddies/invite/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to respond to invitation');
      }

      setCurrentPage(action === 'accept' ? 'accepted' : 'declined');
    } catch (err: any) {
      setError(err.message || 'Failed to respond');
      setCurrentPage('error');
    } finally {
      setLoading(false);
    }
  };

  if (currentPage === 'loading') {
    return (
      <div style={{ 
        margin: 0, 
        padding: '20px', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        background: '#F9FAFB',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <img src={logo} alt="Mind Measure" style={{ height: '100px', width: 'auto', marginBottom: '24px' }} />
          <p style={{ fontSize: '16px', color: '#6B7280' }}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (currentPage === 'error') {
    return (
      <div style={{ 
        margin: 0, 
        padding: '20px', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        background: '#F9FAFB',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <img src={logo} alt="Mind Measure" style={{ height: '100px', width: 'auto' }} />
        </div>

        <div style={{ 
          maxWidth: '500px', 
          background: 'white', 
          borderRadius: '16px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
          padding: '48px 32px', 
          textAlign: 'center' 
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', color: '#EF4444' }}>⚠️</div>
          
          <h1 style={{ fontSize: '24px', color: '#1F2937', margin: '0 0 16px 0' }}>
            Unable to load invitation
          </h1>
          
          <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            {error || 'This invitation link may be invalid or expired.'}
          </p>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            mindmeasure.app
          </p>
        </div>
      </div>
    );
  }

  if (currentPage === 'accepted') {
    return (
      <div style={{ 
        margin: 0, 
        padding: '20px', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        background: '#F9FAFB',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <img src={logo} alt="Mind Measure" style={{ height: '100px', width: 'auto' }} />
        </div>

        <div style={{ 
          maxWidth: '500px', 
          background: 'white', 
          borderRadius: '16px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
          padding: '48px 32px', 
          textAlign: 'center' 
        }}>
          
          <div style={{ fontSize: '64px', marginBottom: '24px', color: '#10B981' }}>✓</div>
          
          <h1 style={{ fontSize: '24px', color: '#1F2937', margin: '0 0 16px 0' }}>
            You're now a Buddy for {inviteData?.inviterName}
          </h1>
          
          <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            You may occasionally receive a gentle email nudge encouraging you to check in with them. You can opt out at any time using the link in any Buddy email.
          </p>
          
          <button 
            onClick={() => window.close()}
            style={{ 
              padding: '14px 32px', 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', 
              border: 'none', 
              borderRadius: '10px', 
              color: 'white', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
            }}
          >
            Done
          </button>
          
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            mindmeasure.app
          </p>
        </div>
      </div>
    );
  }
  
  if (currentPage === 'declined') {
    return (
      <div style={{ 
        margin: 0, 
        padding: '20px', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
        background: '#F9FAFB',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <img src={logo} alt="Mind Measure" style={{ height: '100px', width: 'auto' }} />
        </div>

        <div style={{ 
          maxWidth: '500px', 
          background: 'white', 
          borderRadius: '16px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
          padding: '48px 32px', 
          textAlign: 'center' 
        }}>
          
          <h1 style={{ fontSize: '24px', color: '#1F2937', margin: '0 0 16px 0' }}>
            You've declined the invite
          </h1>
          
          <p style={{ fontSize: '16px', color: '#64748B', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            No problem. You won't receive any more emails about this invite.
          </p>
          
          <button 
            onClick={() => window.close()}
            style={{ 
              padding: '14px 32px', 
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', 
              border: 'none', 
              borderRadius: '10px', 
              color: 'white', 
              fontSize: '16px', 
              fontWeight: '600', 
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
            }}
          >
            Done
          </button>
          
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
            mindmeasure.app
          </p>
        </div>
      </div>
    );
  }
  
  // Consent page
  return (
    <div style={{ 
      margin: 0, 
      padding: '20px', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      background: '#F9FAFB',
      minHeight: '100vh'
    }}>
      
      {/* Logo */}
      <div style={{ maxWidth: '640px', margin: '0 auto 24px auto', display: 'flex', justifyContent: 'center' }}>
        <img src={logo} alt="Mind Measure" style={{ height: '70px', width: 'auto' }} />
      </div>

      <div style={{ 
        maxWidth: '640px', 
        margin: '0 auto', 
        background: 'white', 
        borderRadius: '16px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)', 
        overflow: 'hidden' 
      }}>
        
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', 
          padding: '40px 32px', 
          textAlign: 'center' 
        }}>
          <h1 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '26px' }}>
            You've been invited to be a Buddy
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.95)', margin: 0, fontSize: '16px' }}>
            {inviteData?.inviterName} has asked if you'd be willing to be a Buddy on Mind Measure.
          </p>
        </div>
        
        {/* Content */}
        <div style={{ padding: '40px 32px' }}>
          
          {/* What Mind Measure is */}
          <h2 style={{ fontSize: '18px', color: '#1F2937', margin: '0 0 8px 0' }}>
            What Mind Measure is
          </h2>
          <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            Mind Measure is a wellbeing check-in tool that helps students notice changes in how they're feeling over time.
          </p>
          
          {/* What being a Buddy means */}
          <h2 style={{ fontSize: '18px', color: '#1F2937', margin: '0 0 8px 0' }}>
            What being a Buddy means
          </h2>
          <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 8px 0' }}>
            As a Buddy, you may occasionally receive an email reminding you to check in with {inviteData?.inviterName}.
          </p>
          <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            You will not see their wellbeing scores, check-ins, or any personal details from the app.
          </p>
          
          {/* What this is not */}
          <h2 style={{ fontSize: '18px', color: '#1F2937', margin: '0 0 8px 0' }}>
            What this is not
          </h2>
          <ul style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.7, paddingLeft: '24px', margin: '0 0 28px 0' }}>
            <li>This is not an emergency or crisis service</li>
            <li>You are not expected to monitor {inviteData?.inviterName}</li>
            <li>You are not expected to provide professional support</li>
          </ul>
          
          {/* When you might be contacted */}
          <h2 style={{ fontSize: '18px', color: '#1F2937', margin: '0 0 8px 0' }}>
            When you might be contacted
          </h2>
          <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            If {inviteData?.inviterName} seems to be finding things harder than usual, we may send you a gentle email nudge to check in. This will be occasional, not frequent, and never urgent.
          </p>
          
          {/* Your data */}
          <h2 style={{ fontSize: '18px', color: '#1F2937', margin: '0 0 8px 0' }}>
            Your data
          </h2>
          <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: 1.6, margin: '0 0 12px 0' }}>
            We will use your email address only to send Buddy emails if you accept. You can opt out at any time using a link in any Buddy email.
          </p>
          <p style={{ fontSize: '14px', margin: '0 0 32px 0' }}>
            <a href="#privacy" style={{ color: '#8B5CF6', textDecoration: 'none' }}>Privacy policy</a> • 
            <a href="#how-it-works" style={{ color: '#8B5CF6', textDecoration: 'none' }}> How Buddies work</a>
          </p>
          
          {/* Consent action */}
          <div style={{ background: '#F9FAFB', padding: '28px', borderRadius: '12px', marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                onClick={() => handleRespond('accept')}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', 
                  border: 'none', 
                  borderRadius: '10px', 
                  color: 'white', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  cursor: loading ? 'not-allowed' : 'pointer', 
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)' 
                }}
              >
                {loading ? 'Processing...' : 'Accept and become a Buddy'}
              </button>
              <button 
                onClick={() => handleRespond('decline')}
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  background: '#FFFFFF', 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '10px', 
                  color: '#6B7280', 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                Decline
              </button>
            </div>
            
            <p style={{ fontSize: '13px', color: '#9CA3AF', textAlign: 'center', margin: '16px 0 0 0' }}>
              No explanation needed. You can opt out at any time if you accept.
            </p>
          </div>
          
        </div>
        
      </div>

      {/* Footer */}
      <div style={{ maxWidth: '640px', margin: '24px auto 0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
          mindmeasure.app
        </p>
      </div>
    </div>
  );
}
