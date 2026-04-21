"use client";

if (typeof window !== 'undefined') {
    // Dynamically import buffer only in browser to avoid SSR crash
    import('buffer').then(({ Buffer }) => {
        (window as any).Buffer = Buffer;
    });
    (window as any).global = window;
    (window as any).process = {
        ...(window as any).process,
        env: { NODE_ENV: process.env.NODE_ENV },
        nextTick: (cb: Function) => setTimeout(cb, 0),
        browser: true
    };
}
