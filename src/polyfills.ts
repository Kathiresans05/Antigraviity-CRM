"use client";

import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
    (window as any).Buffer = Buffer;
    (window as any).global = window;
    (window as any).process = {
        ...(window as any).process,
        env: { NODE_ENV: process.env.NODE_ENV },
        nextTick: (cb: Function) => setTimeout(cb, 0),
        browser: true
    };
}
