export {};

declare global {
  interface Window {
    electronAPI: {
      monitoring: {
        start: (payload?: any) => Promise<{ success: boolean; status: string }>;
        stop: () => Promise<{ success: boolean }>;
        getStats: () => Promise<{
          keyboardCount: number;
          mouseCount: number;
          idleSeconds: number;
          activeSeconds: number;
          startTime: string | null;
          activeApp?: string;
          windowTitle?: string;
        }>;
        flush: () => Promise<{
          keyboardCount: number;
          mouseCount: number;
          idleSeconds: number;
          activeSeconds: number;
        }>;
        status: () => Promise<{ status: string; error?: string }>;
        ping: () => Promise<{ success: boolean; timestamp: number }>;
        onIdleWarning: (callback: () => void) => void;
      };
      banner?: {
        hide: () => void;
      };
    };
  }
}
