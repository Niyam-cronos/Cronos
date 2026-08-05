import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { APP } from '@/constants';
import { sleep } from '@/utils';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function useAppSplash() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await SplashScreen.hideAsync().catch(() => undefined);
      await sleep(APP.splashDurationMs);
      if (mounted) setIsReady(true);
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  return { isReady };
}
