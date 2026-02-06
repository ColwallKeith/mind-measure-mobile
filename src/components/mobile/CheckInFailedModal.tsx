interface CheckInFailedModalProps {
  isOpen: boolean;
  onReturnToDashboard: () => void;
}

export function CheckInFailedModal({ isOpen, onReturnToDashboard }: CheckInFailedModalProps) {
  if (!isOpen) return null;

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
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient background */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)',
            padding: '32px 24px 24px',
            position: 'relative',
          }}
        >
          {/* Icon */}
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
            <div
              style={{
                fontSize: '32px',
                lineHeight: 1,
              }}
            >
              ⚠️
            </div>
          </div>

          {/* Title */}
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
            Check-in incomplete
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 24px' }}>
          <p
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#4B5563',
              textAlign: 'center',
              margin: '0 0 32px 0',
            }}
          >
            Sorry, unfortunately your check-in was not long enough to give us an accurate reading of your mood. Please try again.
          </p>

          {/* Return to Dashboard Button */}
          <button
            onClick={onReturnToDashboard}
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
            Return to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
