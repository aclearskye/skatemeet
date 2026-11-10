import type { ReactNode } from "react";

import type { Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthContext, type AuthData } from "@/lib/context/use-auth-context";
import { DrawerProvider } from "@/lib/context/drawer-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { UploadQueueProvider } from "@/lib/context/upload-queue-context";
import { VideoSoundProvider } from "@/lib/context/video-sound-context";
import { KeyboardProvider } from "@/lib/shared/keyboard";
import { ToastHost } from "@/components/ui/ToastHost";

import { SAMPLE_PROFILE } from "./fixtures";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// A fake signed-in skater, so components render their signed-in state without
// a real Supabase session. Queries still go to Supabase (as anon) and come back
// empty; mutations fail.
const MOCK_SESSION = {
  access_token: "storybook",
  user: { id: SAMPLE_PROFILE.profile_id },
} as unknown as Session;

const MOCK_AUTH: AuthData = {
  session: MOCK_SESSION,
  profile: SAMPLE_PROFILE,
  isLoadingAuthContext: false,
  isLoggedIn: true,
  isBanned: false,
  refreshProfile: async () => {},
};

// The app-wide contexts components expect, without the app's own
// AuthProvider, navigation or layout. Mounted per story (see preview.tsx), so
// drawer / toast / upload state starts fresh on each one.
export function StoryProviders({ children }: { children: ReactNode }) {
  return (
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={MOCK_AUTH}>
          <DrawerProvider>
            <ToastProvider>
              <UploadQueueProvider>
                <VideoSoundProvider>
                  {children}
                  <ToastHost />
                </VideoSoundProvider>
              </UploadQueueProvider>
            </ToastProvider>
          </DrawerProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
