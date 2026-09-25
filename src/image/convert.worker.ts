import { convertImage } from "./convert";
import {
  packPoints,
  type ConversionRequest,
  type ConversionResponse,
} from "./conversionProtocol";

self.onmessage = (event: MessageEvent<ConversionRequest>) => {
  const { image, rect, rotation, settings } = event.data;
  const out = convertImage(image, rect, settings, rotation);
  const response: ConversionResponse = {
    packed: packPoints(out.points),
    mask: out.mask,
    width: out.width,
    height: out.height,
  };
  (self as unknown as Worker).postMessage(response, [
    response.packed.buffer,
    response.mask.buffer,
  ]);
};
