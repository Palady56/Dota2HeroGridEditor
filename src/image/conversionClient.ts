import type { ConversionOutput } from "./convert";
import {
  unpackPoints,
  type ConversionRequest,
  type ConversionResponse,
} from "./conversionProtocol";

export type ConversionClient = {
  request: (req: ConversionRequest) => void;
  dispose: () => void;
};

/** One conversion at a time; while busy only the newest request is kept. */
export function createConversionClient(
  onResult: (out: ConversionOutput) => void,
): ConversionClient {
  const worker = new Worker(new URL("./convert.worker.ts", import.meta.url), {
    type: "module",
  });
  let busy = false;
  let pending: ConversionRequest | null = null;

  const send = (req: ConversionRequest) => {
    busy = true;
    worker.postMessage(req, [req.image.data.buffer as ArrayBuffer]);
  };

  worker.onmessage = (event: MessageEvent<ConversionResponse>) => {
    busy = false;
    const { packed, mask, width, height } = event.data;
    onResult({ points: unpackPoints(packed), mask, width, height });
    if (pending) {
      const next = pending;
      pending = null;
      send(next);
    }
  };
  worker.onerror = (event) => {
    busy = false;
    console.error("Conversion worker failed", event);
  };

  return {
    request(req) {
      if (busy) pending = req;
      else send(req);
    },
    dispose() {
      worker.terminate();
    },
  };
}
