interface BuddyResponseModalProps {
  isOpen: boolean;
  type: 'accepted' | 'declined';
  buddyName: string;
  onClose: () => void;
  onChooseAnother?: () => void;
}

export function BuddyResponseModal({ isOpen, type, buddyName, onClose, onChooseAnother }: BuddyResponseModalProps) {
  if (!isOpen) return null;

  const isAccepted = type === 'accepted';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: isAccepted
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
            padding: '32px 24px 24px',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div style={{ fontSize: '32px', lineHeight: 1 }}>{isAccepted ? '✓' : '○'}</div>
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FFFFFF',
              textAlign: 'center',
              margin: 0,
              position: 'relative',
            }}
          >
            {isAccepted ? `${buddyName} accepted your Buddy invite` : `${buddyName} declined your Buddy invite`}
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          <p
            style={{
              fontSize: '15px',
              lineHeight: '1.6',
              color: '#4B5563',
              textAlign: 'center',
              margin: '0 0 24px',
            }}
          >
            {isAccepted
              ? "They'll only be nudged occasionally if things seem harder for you. You can remove them at any time."
              : "That's okay. People have different capacities."}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isAccepted ? (
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'transform 200ms ease, box-shadow 200ms ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onChooseAnother?.();
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'transform 200ms ease, box-shadow 200ms ease',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
                  }}
                >
                  Choose another Buddy
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#6B7280',
                    cursor: 'pointer',
                    transition: 'background 200ms ease, color 200ms ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F3F4F6';
                    e.currentTarget.style.color = '#4B5563';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6B7280';
                  }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
