import { Server, type Socket, type ServerOpts } from "net";
import { existsSync, unlinkSync } from "fs";
import UDSInterface, { type UDSInterfaceOptions } from "./network.js";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
  timeout: NodeJS.Timeout;
}

interface FJTPClientOptions {
  UDSInterfaceOptions?: UDSInterfaceOptions;
}

export class FJTPClient {
  public socket: Socket;
  private requestCounter: number;
  private pendingRequests: { [id: number]: PendingRequest } = {};
  protected network: UDSInterface;

  constructor(options: FJTPClientOptions = {}) {
    this.network = new UDSInterface(options.UDSInterfaceOptions);
    this.socket = this.network.socket;
    this.requestCounter = 0;
    this.network.read(this.processResponse.bind(this));
  }

  private addPendingRequest(id: number, resolve: (value: any) => void, reject: (reason: Error) => void, timeoutMs: number) {
    this.pendingRequests[id] = {
      resolve,
      reject,
      timeout: setTimeout(() => {
        delete this.pendingRequests[id];
        reject(new Error("RPC timeout"));
      }, timeoutMs)
    };
  }

  private processResponse(response: any): void {
    const requestId = response[0];
    const pending = this.pendingRequests[requestId];
    if (!pending) return; // No pending request with this ID

    clearTimeout(pending.timeout);
    delete this.pendingRequests[requestId];

    if (!response[2]) pending.resolve(response[1]);
    else pending.reject(new Error(response[1]));
  }

  public rpc(data: any, timeoutMs: number = 5000): Promise<any> {
    const requestId = this.requestCounter++;
    this.network.write([requestId, data]);
    return new Promise((resolve, reject) => {
      this.addPendingRequest(requestId, resolve, reject, timeoutMs);
    });
  }

  public on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    this.network.socket.on(eventName, listener);
    return this;
  }

  public connect(path: string, connectionListener?: () => void): this {
    this.network.connect(path, connectionListener);
    return this;
  }
}

class FJTPConnection extends FJTPClient {
  private handler?: (data: any) => void;

  constructor(socket: Socket, clientOptions: FJTPClientOptions = {}) {
    super(clientOptions);
    this.network.socket = socket;
    this.network.read(this.processRequest.bind(this));
  }

  public override rpc(data: any, timeoutMs: number = 5000): Promise<any> {
    throw new Error('FJTPConnection does not support initiating RPC calls.');
  }

  public override connect(path: string, connectionListener?: (() => void)): this {
    throw new Error('FJTPConnection instances are already connected.');
  }

  private processRequest(request: any): void {
    if (!this.handler) return;
    try {
      const response = this.handler(request[1]);
      this.network.write([request[0], response]);
    } catch (error: any) {
      const errorString = error instanceof Error ? error.toString() : String(error);
      this.network.write([request[0], errorString, true]);
    }
  }

  public onRequest(handler: (data: any) => void): void {
    this.handler = handler;
  }
}

interface FJTPServerOptions {
  clientOptions?: FJTPClientOptions;
  serverOptions?: ServerOpts;
}

export class FJTPServer {
  public server: Server;

  constructor(options: FJTPServerOptions = {}, connectionListener?: (socket: FJTPConnection) => void) {
    if (options instanceof Function) connectionListener = options as any;
    this.server = new Server(options.serverOptions, connectionListener ? this.wrapListener(connectionListener, options.clientOptions) : undefined);
  }

  public onConnection(connectionListener: (socket: FJTPConnection) => void, clientOptions?: FJTPClientOptions): this {
    this.server.on('connection', this.wrapListener(connectionListener, clientOptions));
    return this;
  }

  public on(eventName: string | symbol, listener: (...args: any[]) => void): this {
    if (eventName === 'connection') throw new Error('Use onConnection() to listen for new connections');
    this.server.on(eventName, listener);
    return this;
  }

  private wrapListener(listener: (socket: FJTPConnection) => void, options?: FJTPClientOptions): (rawSocket: Socket) => void {
    return (rawSocket: Socket) => {
      const customSocket = new FJTPConnection(rawSocket, options);
      listener(customSocket);
    };
  };

  public listen(path: string, listeningListener?: (() => void)): this {
    if (existsSync(path)) unlinkSync(path);
    this.server.listen(path, listeningListener);
    return this;
  }
}