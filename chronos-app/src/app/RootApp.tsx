import { CronosBrandSplash } from '@/components';
import { useAppSplash } from '@/hooks';
import { HomeScreen } from '@/screens';

export function RootApp() {
  const { isReady } = useAppSplash();

  if (!isReady) {
    return <CronosBrandSplash />;
  }

  return <HomeScreen />;
}
