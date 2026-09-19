import { useTokenStore } from '../store/useTokenStore';

export const useTokenGate = () => {
  const { tokens, setPaywallVisible } = useTokenStore();

  const gateAction = (requiredCost: number, onAllowed: () => void, onDenied?: () => void) => {
    if (tokens >= requiredCost) {
      onAllowed();
    } else {
      setPaywallVisible(true);
      if (onDenied) onDenied();
    }
  };

  return { gateAction };
};

export default useTokenGate;
