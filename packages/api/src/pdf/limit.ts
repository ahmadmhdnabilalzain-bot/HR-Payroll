import { ApiError } from "../http/errors";
import type { PdfRenderer } from "./renderer";

export interface RenderLimits {
  /** Renders running at once. */
  concurrent: number;
  /** Renders allowed to wait; more answer 503 at once. */
  queue: number;
  retryAfterSeconds: number;
}

/** Product defaults (not statutory): 3 at once, 6 waiting. */
export const DEFAULT_RENDER_LIMITS: RenderLimits = { concurrent: 3,
  queue: 6, retryAfterSeconds: 5 };

/**
 * A renderer that runs at most `concurrent` renders, queues up to
 * `queue` more, and refuses the rest with 503 PDF_RENDERER_BUSY and a
 * Retry-After, so a burst of letters cannot pile up on Chrome.
 */
export function limitRenders(inner: PdfRenderer, l: RenderLimits)
  : PdfRenderer {
  const { acquire, release } = gate(l);
  return {
    render: async (page) => {
      await acquire();
      try {
        return await inner.render(page);
      } finally {
        release();
      }
    },
    close: () => inner.close(),
  };
}

/** A counting semaphore with a bounded queue. */
function gate(l: RenderLimits) {
  let running = 0;
  const waiting: (() => void)[] = [];
  const acquire = async () => {
    if (running < l.concurrent) {
      running++;
      return;
    }
    if (waiting.length >= l.queue) {
      const e = new ApiError("PDF_RENDERER_BUSY");
      e.retryAfterSeconds = l.retryAfterSeconds;
      throw e;
    }
    await new Promise<void>((ok) => waiting.push(ok));
  };
  const release = () => {
    const next = waiting.shift();
    if (next === undefined) running--;
    else next();
  };
  return { acquire, release };
}
