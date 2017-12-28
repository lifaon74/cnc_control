import { createSharedBuffer } from 'shared-buffer';

export class SharedBufferStream {
  static ID: number = 10;

  static PACKET_ID_REG: number = 0;
  static PACKET_SIZE_REG: number = 1;
  static START_OFFSET: number = 5;

  static createMaster(size: number = 1e6 * Uint8Array.BYTES_PER_ELEMENT, id: number = this.ID++) {
    const sharedBuffer: SharedBufferStream = new SharedBufferStream(new Uint8Array(createSharedBuffer(id, size, true)));
    sharedBuffer.packetId = -1;
    // sharedBuffer.size = 0;
    return sharedBuffer;
  }

  static create(size: number = 1e6 * Uint8Array.BYTES_PER_ELEMENT, id: number = this.ID++) {
    return new SharedBufferStream(new Uint8Array(createSharedBuffer(id, size)));
  }

  public buffer: Uint8Array;
  protected packetId: number;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.packetId = 0;
  }

  get readable(): boolean {
    return this.buffer[SharedBufferStream.PACKET_ID_REG] !== this.packetId;
  }

  get size(): number {
    return (
      this.buffer[SharedBufferStream.PACKET_SIZE_REG    ]
      | (this.buffer[SharedBufferStream.PACKET_SIZE_REG + 1] << 8)
      | (this.buffer[SharedBufferStream.PACKET_SIZE_REG + 2] << 16)
      | (this.buffer[SharedBufferStream.PACKET_SIZE_REG + 3] << 24)
    ) >>> 0;
  }

  set size(value: number) {
    this.buffer[SharedBufferStream.PACKET_SIZE_REG    ] = value;
    this.buffer[SharedBufferStream.PACKET_SIZE_REG + 1] = value >> 8;
    this.buffer[SharedBufferStream.PACKET_SIZE_REG + 2] = value >> 16;
    this.buffer[SharedBufferStream.PACKET_SIZE_REG + 3] = value >> 24;
  }

  get maxSize(): number {
    return this.buffer.length - SharedBufferStream.START_OFFSET;
  }

  get data(): Uint8Array {
    return this.buffer.subarray(SharedBufferStream.START_OFFSET, SharedBufferStream.START_OFFSET + this.size);
  }

  set data(value: Uint8Array) {
    this.size = value.length;
    this.buffer.set(value, SharedBufferStream.START_OFFSET);
  }

  receive(): void {
    this.packetId = this.buffer[SharedBufferStream.PACKET_ID_REG];
  }

  send(): void {
    this.packetId = (this.packetId + 1) % 256;
    this.buffer[SharedBufferStream.PACKET_ID_REG] = this.packetId;
  }
}
