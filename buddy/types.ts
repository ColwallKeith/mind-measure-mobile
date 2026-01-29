// Shared TypeScript interfaces for Buddy module

export interface Buddy {
  id: string;
  name: string;
  phone: string;
  email: string;
  rank: number;
}

export interface PendingInvite {
  id: string;
  name: string;
  email: string;
  sentDate: Date;
  // Future fields for backend integration:
  // inviteToken: string; // Tokenised single-use URL for consent page
  // expiresAt: Date; // Invite expires after 14 days
}
