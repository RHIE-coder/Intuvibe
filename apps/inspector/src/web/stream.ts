// web/stream.ts — /api/stream SSE 구독 팩토리. jsdom 등 EventSource 미지원 환경에선 no-op.

import type { StreamEvent } from '../shared/protocol.js';

export interface StreamHandle {
  close(): void;
}

export type OpenStream = (onEvent: (ev: StreamEvent) => void) => StreamHandle;

export const openStream: OpenStream = (onEvent) => {
  if (typeof EventSource === 'undefined') {
    return { close: () => {} };
  }
  const es = new EventSource('/api/stream');
  es.onmessage = (msg: MessageEvent) => {
    try {
      onEvent(JSON.parse(msg.data) as StreamEvent);
    } catch {
      // malformed payload — drop.
    }
  };
  // EventSource 기본 재연결에 맡긴다.
  es.onerror = () => {};
  return { close: () => es.close() };
};
