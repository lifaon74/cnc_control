// import { createSharedBuffer } from 'shared-buffer';
const addon = require('./c/build/Release/binding');

interface NodeSharedBuffer {
  new(key: string, size: number): NodeSharedBuffer;
  readonly key: string;
  readonly size: number;
  readonly opened: boolean;
  readonly buffer: ArrayBuffer | null;

  open(initialize?: boolean): void;
  close(): void;
}

export class SharedBufferStream extends (addon.NodeSharedBuffer as NodeSharedBuffer) {
  static PACKET_ID_REG: number = 0;
  static PACKET_SIZE_REG: number = 1;
  static START_OFFSET: number = 5;

  public bufferView: Uint8Array | null;

  protected _packetId: number;

  constructor(key: string, size: number) {
    super(key, size);
    this._updateBufferView();
    this._packetId = 0;
  }

  get readable(): boolean {
    return this.bufferView[SharedBufferStream.PACKET_ID_REG] !== this._packetId;
  }

  get size(): number {
    return (
      this.bufferView[SharedBufferStream.PACKET_SIZE_REG    ]
      | (this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 1] << 8)
      | (this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 2] << 16)
      | (this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 3] << 24)
    ) >>> 0;
  }

  set size(value: number) {
    this.bufferView[SharedBufferStream.PACKET_SIZE_REG    ] = value;
    this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 1] = value >> 8;
    this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 2] = value >> 16;
    this.bufferView[SharedBufferStream.PACKET_SIZE_REG + 3] = value >> 24;
  }

  get maxSize(): number {
    return this.bufferView.length - SharedBufferStream.START_OFFSET;
  }

  get data(): Uint8Array {
    return this.bufferView.subarray(SharedBufferStream.START_OFFSET, SharedBufferStream.START_OFFSET + this.size);
  }

  set data(value: Uint8Array) {
    this.size = value.length;
    this.bufferView.set(value, SharedBufferStream.START_OFFSET);
  }

  open(initialize?: boolean): void {
    super.open(initialize);
    this._updateBufferView();
  }

  close(): void {
    super.close();
    this._updateBufferView();
  }

  receive(): void {
    this._packetId = this.bufferView[SharedBufferStream.PACKET_ID_REG];
  }

  send(): void {
    this._packetId = (this._packetId + 1) % 256;
    this.bufferView[SharedBufferStream.PACKET_ID_REG] = this._packetId;
  }

  protected _updateBufferView(): void {
    const buffer: ArrayBuffer = this.buffer;
    if (buffer === null) {
      this.bufferView = null;
    } else {
      this.bufferView = new Uint8Array(buffer);
    }
  }
}
