import { useState } from 'react';

export interface CheckinConversation {
  isActive: boolean;
  messages: any[];
}

export function useCheckinConversation() {
  const [conversation, setConversation] = useState<CheckinConversation>({
    isActive: false,
    messages: []
  });

  const startConversation = () => {
    setConversation(prev => ({ ...prev, isActive: true }));
  };

  const endConversation = () => {
    setConversation(prev => ({ ...prev, isActive: false }));
  };

  return {
    conversation,
    startConversation,
    endConversation
  };
}
