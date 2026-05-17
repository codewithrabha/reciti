import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDED_KEY } from '@/lib/storage-keys';

interface OnboardingContextType {
  /** null while the persisted flag is still loading. */
  needsOnboarding: boolean | null;
  /** Marks onboarding done — persists the flag and flips the route guard. */
  completeOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  needsOnboarding: null,
  completeOnboarding: async () => {},
});

export const OnboardingProvider = ({ children }: { children: React.ReactNode }) => {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((value) => setNeedsOnboarding(value !== 'true'))
      .catch(() => setNeedsOnboarding(true));
  }, []);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      // Non-fatal — worst case onboarding shows again next launch.
    }
    setNeedsOnboarding(false);
  };

  return (
    <OnboardingContext.Provider value={{ needsOnboarding, completeOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
