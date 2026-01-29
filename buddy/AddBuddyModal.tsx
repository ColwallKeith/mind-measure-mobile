import { useState } from 'react';

interface AddBuddyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (buddy: { name: string; email: string; personalMessage?: string }) => void;
  currentBuddyCount: number;
}

export function AddBuddyModal({ isOpen, onClose, onAdd, currentBuddyCount }: AddBuddyModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    onAdd({ name, email, personalMessage });
    
    // Reset form
    setName('');
    setEmail('');
    setPersonalMessage('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#0F172A',
              margin: '0 0 8px 0'
            }}>
              Invite a Buddy
            </h2>
            <p style={{ 
              fontSize: '14px', 
              color: '#64748B', 
              margin: 0
            }}>
              Inviting buddy {currentBuddyCount + 1} of 5
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Name Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '8px'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter buddy's name"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                  transition: 'border-color 0.2s',
                  color: '#0F172A'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B5CF6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              />
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '8px'
              }}>
                Email address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="buddy@example.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                  transition: 'border-color 0.2s',
                  color: '#0F172A'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B5CF6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              />
            </div>

            {/* Personal Message Field */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155',
                marginBottom: '8px'
              }}>
                Personal message (optional)
              </label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  backgroundColor: '#FFFFFF',
                  transition: 'border-color 0.2s',
                  color: '#0F172A',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#8B5CF6';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '15px',
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
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
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
                Send invite
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
