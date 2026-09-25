import { convertImage } from "./convert";
import {
  packFill,
  packPoints,
  type ConversionRequest,
  type ConversionResponse,
} from "./conversionProtocol";

self.onmessage = (event: MessageEvent<ConversionRequest>) => {
  const { image, rect, rotation, settings, id } = event.data;
  const out = convertImage(image, rect, settings, rotation);
  const response: ConversionResponse = {
    packed: packPoints(out.points),
    packedFill: packFill(out.fill),
    mask: out.mask,
    width: out.width,
    height: out.height,
    id,
  };
  (self as unknown as Worker).postMessage(response, [
    response.packed.buffer,
    response.packedFill.buffer,
    response.mask.buffer,
  ]);
};
