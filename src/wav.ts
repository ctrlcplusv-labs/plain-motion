const HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const BITS_PER_SAMPLE = 16;
const PCM_FORMAT = 1;
const FMT_CHUNK_BYTES = 16;
const RIFF_SIZE_OFFSET = 8;
const MAX_POSITIVE = 0x7fff;
const MAX_NEGATIVE = 0x8000;
const BASE64_CHUNK = 0x8000;

function writeText(view: DataView, offset: number, text: string): void {
  [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
}

export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const frameCount = channels[0]?.length ?? 0;
  const blockAlign = channels.length * BYTES_PER_SAMPLE;
  const dataBytes = frameCount * blockAlign;
  const view = new DataView(new ArrayBuffer(HEADER_BYTES + dataBytes));

  writeText(view, 0, "RIFF");
  view.setUint32(4, HEADER_BYTES - RIFF_SIZE_OFFSET + dataBytes, true);
  writeText(view, 8, "WAVE");
  writeText(view, 12, "fmt ");
  view.setUint32(16, FMT_CHUNK_BYTES, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeText(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let frame = 0; frame < frameCount; frame += 1) {
    channels.forEach((channel, channelIndex) => {
      const sample = Math.max(-1, Math.min(1, channel[frame] ?? 0));
      const value = sample < 0 ? sample * MAX_NEGATIVE : sample * MAX_POSITIVE;
      view.setInt16(HEADER_BYTES + frame * blockAlign + channelIndex * BYTES_PER_SAMPLE, Math.round(value), true);
    });
  }

  return view.buffer;
}

export function normalizePeak(channels: Float32Array[], target: number): void {
  const peak = channels.reduce((max, channel) => channel.reduce((inner, sample) => Math.max(inner, Math.abs(sample)), max), 0);
  if (peak === 0) return;
  const gain = target / peak;
  channels.forEach((channel) => channel.forEach((sample, index) => (channel[index] = sample * gain)));
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK));
  }
  return btoa(binary);
}
