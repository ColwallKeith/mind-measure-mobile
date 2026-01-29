interface PendingInviteCardProps {
  invite: {
    id: string;
    name: string;
    email: string;
    sentDate: Date;
  };
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
}

export function PendingInviteCard({ invite, onResend, onCancel }: PendingInviteCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        marginBottom: '12px',
        border: '1px solid #F0F0F0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Header Info */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#0F172A', 
            margin: 0
          }}>
            {invite.name}
          </h3>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#F59E0B',
            backgroundColor: '#FEF3C7',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            Pending
          </span>
        </div>

        <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '4px' }}>
          Email: {invite.email}
        </div>

        <div style={{ fontSize: '13px', color: '#94A3AF' }}>
          Sent {formatDate(invite.sentDate)}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={() => onResend(invite.id)}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#E2E8F0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#F1F5F9';
          }}
        >
          Resend invite
        </button>
        <button
          onClick={() => onCancel(invite.id)}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#DC2626',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#FECACA';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FEE2E2';
          }}
        >
          Cancel invite
        </button>
      </div>
    </div>
  );
}
