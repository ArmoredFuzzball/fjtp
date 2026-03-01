import { Socket, type SocketConstructorOpts } from "net";
import PayloadCodec, { type PayloadCodecOptions } from './codec.js';

export interface UDSInterfaceOptions {
  payloadCodecOptions?: PayloadCodecOptions;
  socketConstructorOpts?: SocketConstructorOpts;
}

export default class UDSInterface {
  public socket: Socket;
  private codec: PayloadCodec;
  
  constructor(options: UDSInterfaceOptions = {}) {
    this.socket = new Socket(options.socketConstructorOpts);
    this.codec = new PayloadCodec(options.payloadCodecOptions);
  }

  public write(data: any): void {
    const payload = JSON.stringify(data);
    const encoded = this.codec.encode(payload);
    this.socket.write(encoded);
  }

  public read(listener: (payload: any) => void): void {
    this.socket.on('data', (data: Buffer) => {
      this.codec.decode(data, (decoded) => {
        const payload = JSON.parse(decoded);
        listener(payload);
      });
    });
  }

  public connect(path: string, connectionListener?: () => void): this {
    this.socket.connect(path, connectionListener);
    return this;
  }
}