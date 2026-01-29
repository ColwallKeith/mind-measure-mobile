import { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Info } from 'lucide-react';
import { BuddyCard } from './BuddyCard';
import { AddBuddyModal } from './AddBuddyModal';
import { PendingInviteCard } from './PendingInviteCard';
import { buddiesApi, type BuddyDTO, type InviteDTO } from '@/services/buddies-api';
import { useAuth } from '@/contexts/AuthContext';

const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 24,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  border: '1px solid #F0F0F0',
  marginBottom: 16,
} as const;

export function SupportCircle() {
  const { user } = useAuth();
  const [activeBuddies, setActiveBuddies] = useState<BuddyDTO[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteDTO[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      console.log('[Buddies] Using buddiesApi (GET /api/buddies) — new flow');
      const { activeBuddies: a, pendingInvites: p } = await buddiesApi.list();
      setActiveBuddies(a);
      setPendingInvites(p);
      console.log('[Buddies] Loaded via buddiesApi — active:', a.length, 'pending:', p.length);
    } catch (e) {
      console.error('[Buddies] list error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load buddies');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (p: { name: string; email: string; personalMessage: string }) => {
    try {
      await buddiesApi.createInvite({
        inviteeName: p.name.trim(),
        contactType: 'email',
        contactValue: p.email.trim().toLowerCase(),
        personalMessage: p.personalMessage.trim() || undefined,
      });
      setIsModalOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send invite';
      const inviteCreatedEmailFailed = msg.includes('Invite created but email could not be sent');
      setIsModalOpen(false);
      await load();
      alert(inviteCreatedEmailFailed
        ? `${msg}\n\nThe invite was saved. You can use "Resend invite" on the Buddies screen to try again.`
        : msg);
    }
  };

  const handleResend = async (inviteId: string) => {
    try {
      await buddiesApi.resendInvite(inviteId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to resend invite');
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!window.confirm('Cancel this invite? They won’t be able to accept it.')) return;
    try {
      await buddiesApi.revokeInvite(inviteId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to cancel invite');
    }
  };

  const handleRemoveBuddy = async (buddyId: string) => {
    if (!window.confirm('Remove this buddy? They won’t be notified.')) return;
    try {
      await buddiesApi.removeBuddy(buddyId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove buddy');
    }
  };

  const handleNudge = async (buddyId: string) => {
    try {
      await buddiesApi.nudgeBuddy(buddyId);
      await load();
      alert('Nudge sent. They’ll get a gentle check-in reminder by email.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send nudge');
    }
  };

  const moveCard = useCallback((dragIndex: number, hoverIndex: number) => {
    setActiveBuddies((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, removed);
      return next.map((b, i) => ({ ...b, preferenceOrder: i + 1 }));
    });
  }, []);

  const total = activeBuddies.length + pendingInvites.length;
  const canInvite = total < 5;
  const isEmpty = activeBuddies.length === 0 && pendingInvites.length === 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #e2e8f0', borderTopColor: '#5b8fed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <header
          style={{
            background: '#fff',
            paddingTop: 'max(60px, env(safe-area-inset-top))',
            paddingBottom: 16,
            paddingLeft: 20,
            paddingRight: 20,
            borderBottom: '1px solid #f0f0f0',
            position: 'relative',
            textAlign: isEmpty ? 'center' : 'left',
          }}
        >
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            aria-label="How Buddies work"
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: showInfo ? 'rgba(99, 102, 241, 0.2)' : '#f1f5f9',
              border: 'none',
              color: '#6366f1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Info size={20} />
          </button>
          <div style={{ paddingRight: 44 }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>Buddies</h1>
            <span
              style={{
                display: 'inline-block',
                background: '#f1f5f9',
                color: '#475569',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {total}/5 Buddies
            </span>
          </div>
        </header>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, margin: 16, color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ padding: '20px 16px', maxWidth: 768, margin: '0 auto', paddingBottom: 100 }}>
          {isEmpty ? (
            <div>
              <div style={{ ...cardStyle, textAlign: 'center' }}>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4b5563', margin: '0 0 16px' }}>
                  Buddies are trusted people you invite to be gently reminded to check in with you if things feel harder than usual.
                </p>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: '#4b5563', margin: '0 0 24px' }}>
                  They only take part with consent, never see your scores, and you and they can opt out at any time.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    width: '100%',
                    padding: 16,
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  Invite Your First Buddy
                </button>
              </div>
            </div>
          ) : (
            <>
              {pendingInvites.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>Pending invites</h2>
                  {pendingInvites.map((inv) => (
                    <PendingInviteCard
                      key={inv.id}
                      invite={{ id: inv.id, name: inv.inviteeName, email: inv.contactValueMasked, sentDate: new Date(inv.sentAt) }}
                      onResend={() => handleResend(inv.id)}
                      onCancel={() => handleRevoke(inv.id)}
                    />
                  ))}
                </div>
              )}

              {activeBuddies.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>Active Buddies</h2>
                  {activeBuddies.map((b, idx) => (
                    <BuddyCard
                      key={b.id}
                      buddy={{ id: b.id, name: b.name, phone: '', email: b.email, rank: b.preferenceOrder }}
                      index={idx}
                      onDelete={handleRemoveBuddy}
                      onMove={moveCard}
                      onAskCheckIn={handleNudge}
                    />
                  ))}
                </div>
              )}

              {canInvite && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    width: '100%',
                    maxWidth: 320,
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'block',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  Invite Buddy
                </button>
              )}
            </>
          )}
        </div>

        <AddBuddyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleInvite}
          currentBuddyCount={total}
        />

        {showInfo && (
          <div
            role="dialog"
            aria-label="How Buddies work"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowInfo(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 24,
                maxWidth: 440,
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: 24,
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginTop: 0, marginBottom: 16 }}>
                How Buddies work
              </h3>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4b5563' }}>
                <p style={{ marginTop: 0, marginBottom: 16 }}>
                  A Buddy is someone you trust who agrees to be gently reminded to check in with you if things feel harder than usual.
                </p>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginTop: 0, marginBottom: 8 }}>What happens</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 4 }}>You choose someone and send them an invite</li>
                    <li style={{ marginBottom: 4 }}>They can accept or decline, with no explanation needed</li>
                    <li style={{ marginBottom: 0 }}>If they accept, they may occasionally get a nudge to check in with you</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginTop: 0, marginBottom: 8 }}>What Buddies see</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 4 }}>They do not see your scores, check-ins, or activity</li>
                    <li style={{ marginBottom: 4 }}>They are not alerted in emergencies</li>
                    <li style={{ marginBottom: 0 }}>They are never expected to provide professional support</li>
                  </ul>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginTop: 0, marginBottom: 8 }}>Your control</h4>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li style={{ marginBottom: 4 }}>Buddies are always optional</li>
                    <li style={{ marginBottom: 4 }}>You can add or remove them at any time</li>
                    <li style={{ marginBottom: 0 }}>They can opt out whenever they want</li>
                  </ul>
                </div>
                <p style={{ marginTop: 16, marginBottom: 0, fontStyle: 'italic', color: '#6366f1' }}>
                  Buddies are about staying connected, not monitoring or intervention.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: 12,
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#6366f1',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>
    </DndProvider>
  );
}
