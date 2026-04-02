export {};

declare global {
  interface Window {
    electronAPI: {
      monitoring: {
        start: () => Promise<{ success: boolean }>;
        stop: () => Promise<{ success: boolean }>;
        getStats: () => Promise<{
          keyboardCount: number;
          mouseCount: number;
          idleSeconds: number;
          activeSeconds: number;
          startTime: string | null;
        }>;
        flush: () => Promise<{
          keyboardCount: number;
          mouseCount: number;
          idleSeconds: number;
          activeSeconds: number;
        }>;
      };
    };
  }
}
