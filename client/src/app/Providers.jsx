import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Toaster } from '../components/ui/Toaster.jsx';
import { useAuth } from '../stores/auth.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Restores the demo session from storage and keeps the header in sync. */
function SessionBootstrap() {
  const refresh = useAuth((state) => state.refresh);
  const token = useAuth((state) => state.token);

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  return null;
}

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <SessionBootstrap />
          {children}
          <Toaster />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}
