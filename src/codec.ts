export interface PayloadCodecOptions {
  headerSize?: number;
  encoding?: BufferEncoding;
}

export default class PayloadCodec {
  private HEADER_BYTES: number;
  private ENCODING: BufferEncoding;
  private buffer: Buffer<ArrayBuffer>;

  constructor(payloadCodecOptions: PayloadCodecOptions = {}) {
    this.HEADER_BYTES = payloadCodecOptions.headerSize ?? 4;
    this.ENCODING = payloadCodecOptions.encoding ?? "utf-8";
    this.buffer = Buffer.alloc(0); // leftover bytes between pushes
  }

  public encode(payload: string) {
    const bodyLen = Buffer.byteLength(payload, this.ENCODING);
    const out = Buffer.allocUnsafe(this.HEADER_BYTES + bodyLen);
    out.writeUInt32BE(bodyLen, 0);
    out.write(payload, this.HEADER_BYTES, bodyLen, this.ENCODING);
    return out;
  }

  public decode(chunk: Buffer, callback: (payload: string) => void) {
    // fast path for a single complete payload
    let frameSize = this.HEADER_BYTES + chunk.readUInt32BE(0);
    if (chunk.length === frameSize) {
      const payloadBuf = chunk.subarray(this.HEADER_BYTES, frameSize);
      return callback(payloadBuf.toString(this.ENCODING));
    }
    // // medium path for n complete payloads with leftover
    // if (this.buffer.length === 0) while (chunk.length > frameSize) {
    //   const payloadBuf = chunk.subarray(this.HEADER_BYTES, frameSize);
    //   callback(payloadBuf.toString(this.ENCODING));
    //   chunk = chunk.subarray(frameSize);
    //   frameSize = this.HEADER_BYTES + chunk.readUInt32BE(0);
    // }
    // slow path for fragmented payloads
    // append incoming fragment to our current buffer
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length > this.HEADER_BYTES) {
      const frameSize = this.HEADER_BYTES + this.buffer.readUInt32BE(0);
      if (this.buffer.length < frameSize) return; // no full payload yet
      const payloadBuf = this.buffer.subarray(this.HEADER_BYTES, frameSize);
      callback(payloadBuf.toString(this.ENCODING));
      this.buffer = this.buffer.subarray(frameSize);
    }
  }
}