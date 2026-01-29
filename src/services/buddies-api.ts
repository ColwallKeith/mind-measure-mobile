/**
 * Buddies V1 API client. Email-only invite + consent flow.
 */

import { cognitoApiClient } from './cognito-api-client';

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'https://mobile.mindmeasure.app/api');

async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await cognitoApiClient.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

export interface InviteDTO {
  id: string;
  inviteeName: string;
  contactType: string;
  contactValueMasked: string;
  status: string;
  sentAt: string;
  expiresAt: string;
}

export interface BuddyDTO {
  id: string;
  name: string;
  email: string;
  preferenceOrder: number;
  createdAt: string;
}

export interface ListBuddiesResponse {
  activeBuddies: BuddyDTO[];
  pendingInvites: InviteDTO[];
}

export const buddiesApi = {
  async list(): Promise<ListBuddiesResponse> {
    const r = await authFetch(`${BASE}/buddies`);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((j as { error?: string }).error || 'Failed to list buddies');
    }
    return r.json();
  },

  async createInvite(p: {
    inviteeName: string;
    contactType: 'email';
    contactValue: string;
    personalMessage?: string;
  }): Promise<{ invite: InviteDTO }> {
    const r = await authFetch(`${BASE}/buddies/invite`, {
      method: 'POST',
      body: JSON.stringify(p),
    });
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!r.ok) {
      const msg = [j.error, j.message].filter(Boolean).join(' — ') || 'Failed to create invite';
      throw new Error(msg);
    }
    return j as { invite: InviteDTO };
  },

  async resendInvite(inviteId: string): Promise<void> {
    const r = await authFetch(`${BASE}/buddies/invite/${inviteId}/resend`, { method: 'POST' });
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!r.ok) {
      const msg = [j.error, j.message].filter(Boolean).join(' — ') || 'Failed to resend invite';
      throw new Error(msg);
    }
  },

  async revokeInvite(inviteId: string): Promise<void> {
    const r = await authFetch(`${BASE}/buddies/invite/${inviteId}/revoke`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || 'Failed to revoke invite');
  },

  async removeBuddy(buddyId: string): Promise<void> {
    const r = await authFetch(`${BASE}/buddies/${buddyId}/remove`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || 'Failed to remove buddy');
  },

  async nudgeBuddy(buddyId: string): Promise<void> {
    const r = await authFetch(`${BASE}/buddies/${buddyId}/nudge`, { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j as { error?: string }).error || 'Failed to send nudge');
  },
};
