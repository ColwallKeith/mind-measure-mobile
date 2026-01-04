import { useState } from 'react';

export function useCostTracking() {
  const [cost, setCost] = useState(0);
  
  const addCost = (amount: number) => {
    setCost(prev => prev + amount);
  };
  
  const resetCost = () => {
    setCost(0);
  };
  
  return {
    cost,
    addCost,
    resetCost
  };
}
