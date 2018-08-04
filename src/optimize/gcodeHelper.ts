import * as Stream from 'stream';
import * as $fs from 'fs-extra';
import * as $path from 'path';
import { Float } from '../classes/lib/Float';

export interface GCODECommandToOptions {
  comments?: boolean;
}

export class GCODECommand {
  static GCodeLineRegExp: RegExp = /^([^;]*)(?:;(.*)$|$)/;
  static GCodeParamRegExp: RegExp = /^([a-zA-Z])([0-9.\-]+)/;
  static precision: number = 1e-2;

  static fromString(gcodeLine: string): GCODECommand {
    const command: GCODECommand = new GCODECommand();

    const match: RegExpExecArray | null = GCODECommand.GCodeLineRegExp.exec(gcodeLine.trim());
    if (match !== null) {
      if (match[1]) {
        const split = match[1].split(' ');
        command.command = split[0].trim();
        command.params = {};
        let param: string;
        for (let i = 1, l = split.length; i < l; i++) {
          param = split[i].trim();
          if (param !== '') {
            const paramMatch: RegExpExecArray | null = GCODECommand.GCodeParamRegExp.exec(param);
            if (paramMatch !== null) {
              command.params[paramMatch[1].toLowerCase()] = parseFloat(paramMatch[2]);
            }
          }
        }
      }

      if (match[2]) {
        command.comment = match[2].trim();
      }
    }

    return command;
  }

  public command: string;
  public params: { [key: string]: number };
  public comment: string;

  constructor(
    command: string = '',
    params: { [key: string]: number } = {},
    comment: string = ''
  ) {
    this.command = command;
    this.params = params;
    this.comment = comment;
  }

  // get commandEnum(): number {
  //   return ['G0', 'G1'].indexOf(this.command);
  // }

  isEmpty(): boolean {
    if ((this.command !== '') || (this.comment !== '')) {
      return false;
    }

    for (const key in this.params) {
      return false;
    }

    return true;
  }

  toString(precision: number = GCODECommand.precision): string {
    let commandLine: string = '';
    if (this.command) {
      commandLine += this.command;
    }

    for (const key in this.params) {
      if (commandLine !== '') {
        commandLine += ' ';
      }
      commandLine += key.toUpperCase() + Float.toString(this.params[key], precision);
    }

    if (this.comment) {
      if (commandLine !== '') {
        commandLine += ' ';
      }
      commandLine += '; ' + this.comment;
    }

    return commandLine;
  }

  //experimental, should use the command encoder instead
  toBinary(buffer: Uint8Array, index: number = 0, options: GCODECommandToOptions = {}): number {
    // if (!this.comment)
    if (this.command) {
      switch (this.command) {
        case 'G0':
        case 'G1':
          buffer[index++] = 0;
          let axisNames: string[] = ['X', 'Y', 'Z', 'E'];
          const axisIndex: number = index;
          index++;
          axisNames.forEach((axis: string, i: number) => {
            if (this.params[axis] === void 0) {
              axis = axis.toLowerCase();
            }

            if (this.params[axis] !== void 0) {
              buffer.set(new Uint8Array(new Float32Array([this.params[axis]]).buffer), index);
              index += 4;
              buffer[axisIndex] |= 1 << i;
            }
          });
          break;
        default:
          buffer[index++] = 255;
          const text: Uint8Array = new TextEncoder().encode(this.command);
          buffer.set(text, index);
          index += text.length;
          break;
      }
    } else if (this.comment) {
      if (options.comments) {
        throw new Error('TODO'); // TODO
      }
    } else {
      throw new Error(`Found empty CGODE command.`);
    }

    return index;
  }
}

export class GCodeReaderStream extends Stream.Transform {
  private gcode: string = '';

  constructor() {
    super({ readableObjectMode: true });
  }

  _transform(gcode: Buffer | string, encoding: string, callback: () => void) {
    if (gcode instanceof Buffer) {
      this.parseGCODE(gcode.toString());
      callback();
    } else if (typeof gcode === 'string') {
      this.parseGCODE(gcode);
      callback();
    } else {
      this.emit('error', new Error('Invalid data : expected Buffer | string'));
      this.end();
    }
  }

  protected _flush(callback: () => void) {
    const commands: GCODECommand[] = GCODEHelper.parse(this.gcode);
    this.gcode = '';
    if (commands.length > 0) this.push(commands);
  }

  private parseGCODE(gcode: string) {
    this.gcode += gcode.replace('\r', '');
    let i = this.gcode.length - 1;
    for (; i >= 0; i--) {
      if (this.gcode[i] === '\n') {
        break;
      }
    }
    const commands: GCODECommand[] = GCODEHelper.parse(this.gcode.slice(0, i));
    this.gcode = this.gcode.slice(i, this.gcode.length);
    if (commands.length > 0) this.push(commands);
  }

}

export class GCodeWriterStream extends Stream.Transform {

  static toFile(path: string, callback: (writer: Stream.Readable) => void): Promise<void> {
    return $fs.ensureDir($path.dirname(path))
      .then(() => {
        return new Promise<void>((resolve: any, reject: any) => {
          const writer: Stream.Readable = new Stream.Readable({ objectMode: true });

          const fileWriter: Stream.Writable = $fs.createWriteStream(path);

          fileWriter.on('finish', () => {
            resolve();
          });

          fileWriter.on('error', (error: Error) => {
            reject(error);
          });


          writer.pipe(new GCodeWriterStream()).pipe(fileWriter);

          callback(writer);
        });
      });
  }

  constructor() {
    super({ writableObjectMode: true });
  }

  _transform(commands: GCODECommand[], encoding: string, callback: () => void) {
    if (Array.isArray(commands)) {
      const gcode: string = GCODEHelper.stringify(commands);
      if (gcode) this.push(gcode + '\n');
      callback();
    } else {
      this.emit('error', new Error('Invalid data : expected GCODECommand[]'));
      this.end();
    }
  }

}


export class GCODEHelper {

  static parseFile(path: string): Stream {
    const readStream = $fs.createReadStream(path);
    return readStream.pipe(new GCodeReaderStream());
  }

  static parseFilePromise(path: string): Promise<GCODECommand[]> {
    return new Promise<GCODECommand[]>((resolve: any, reject: any) => {
      const commands: GCODECommand[] = [];
      const parser: Stream = this.parseFile(path);
      parser.on('data', (_commands: GCODECommand[]) => {
        _commands.forEach((command: any) => {
          commands.push(command);
        });
      });

      parser.on('finish', () => {
        resolve(commands);
      });

      parser.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  static parse(gcode: string): GCODECommand[] {
    const gcodeLines: string[] = gcode.split(/\r?\n/);
    const commands: GCODECommand[] = [];
    gcodeLines.forEach((gcodeLine: string) => {
      const command: GCODECommand = GCODECommand.fromString(gcodeLine);
      if (!command.isEmpty()) {
        commands.push(command);
      }
    });
    return commands;
  }

  static stringify(commands: GCODECommand[]): string {
    return commands.map((command: GCODECommand) => command.toString()).join('\n');
  }


  static moveTo(commands: GCODECommand[], x: number, y: number, z?: number, e?: number, speed?: number): GCODECommand[] {
    const params: any = {};
    if (x !== void 0) params.x = x;
    if (y !== void 0) params.y = y;
    if (z !== void 0) params.z = z;
    if (e !== void 0) params.e = e;
    if (speed !== void 0) params.f = speed;
    commands.push(new GCODECommand('G0', params));
    return commands;
  }

  static arc(
    commands: GCODECommand[],
    x: number, y: number, radius: number,
    startAngle: number = 0, angle: number = Math.PI * 2,
    steps: number = 100
  ): GCODECommand[] {
    if (steps > 1) {
      for (let i = 0; i < steps; i++) {
        const a: number = startAngle - angle * i / (steps - 1);
        this.moveTo(
          commands,
          x + Math.cos(a) * radius,
          y + Math.sin(a) * radius
        );
      }
    } else { // TODO : not tested
      this.moveTo(commands,
        x + Math.cos(startAngle) * radius,
        y + Math.sin(startAngle) * radius
      );

      commands.push(new GCODECommand((angle < 0) ? 'G3' : 'G2', {
        x: x + Math.cos(startAngle + angle) * radius,
        y: y + Math.sin(startAngle + angle) * radius,
        i: x,
        j: y
      }));
    }
    return commands;
  }

  static circle(commands: GCODECommand[], x: number, y: number, radius: number, steps: number = 100): GCODECommand[] {
    GCODEHelper.arc(commands, x, y, radius, 0, 2 * Math.PI, steps);
    return commands;
  }

  static square(commands: GCODECommand[], x: number, y: number, side: number): GCODECommand[] {
    const halfSide: number = side / 2;
    GCODEHelper.moveTo(commands, x - halfSide, y - halfSide);
    GCODEHelper.moveTo(commands, x + halfSide, y - halfSide);
    GCODEHelper.moveTo(commands, x + halfSide, y + halfSide);
    GCODEHelper.moveTo(commands, x - halfSide, y + halfSide);
    GCODEHelper.moveTo(commands, x - halfSide, y - halfSide);
    return commands;
  }

  static plentySquare(
    commands: GCODECommand[],
    x: number,
    y: number,
    z: number,
    side: number,
    toolRadius: number,
    overlap: number = 0,
  ): GCODECommand[] {
    const halfSide: number = side / 2;
    const halfSideMinusRadius: number = halfSide - toolRadius;
    GCODEHelper.moveTo(commands, x - halfSideMinusRadius, y - halfSideMinusRadius);
    GCODEHelper.moveTo(commands, 0, 0, z);

    GCODEHelper.moveTo(commands, x + halfSideMinusRadius, y - halfSideMinusRadius);
    GCODEHelper.moveTo(commands, x + halfSideMinusRadius, y + halfSideMinusRadius);
    GCODEHelper.moveTo(commands, x - halfSideMinusRadius, y + halfSideMinusRadius);
    GCODEHelper.moveTo(commands, x - halfSideMinusRadius, y - halfSideMinusRadius);

    const step: number = toolRadius * 2 - overlap;
    const start: number = y - halfSideMinusRadius + step;
    const end: number = y + halfSideMinusRadius;
    const _x: number = y - halfSideMinusRadius + step - toolRadius;
    let odd: boolean = false;
    for (let _y = start; _y < end; _y += step) {
      GCODEHelper.moveTo(commands, odd ? _x : -_x, _y);
      odd = !odd;
    }
    return commands;
  }

  static pause(commands: GCODECommand[], ms: number): GCODECommand[] {
    commands.push(new GCODECommand('G4', { p: ms }));
    return commands;
  }

}


function createCircle(path: string): Promise<void> {
  return GCodeWriterStream.toFile(path, (writer: Stream.Readable) => {
    writer.push(GCODEHelper.circle([], 0, 0, 100, 100));
    writer.push(GCODEHelper.moveTo([], 0, 0));
    writer.push(null);
  });
}

function createSquare(path: string): Promise<void> {
  return GCodeWriterStream.toFile(path, (writer: Stream.Readable) => {
    writer.push(GCODEHelper.square([], 0, 0, 100));
    writer.push(GCODEHelper.moveTo([], 0, 0));
    writer.push(null);
  });
}

function createPlentySquare(path: string): Promise<void> {
  return GCodeWriterStream.toFile(path, (writer: Stream.Readable) => {
    const z: number = 2;
    writer.push(GCODEHelper.plentySquare([], 0, 0, -z, 100, 3 / 2, 0.5));
    writer.push(GCODEHelper.moveTo([], 0, 0, z));
    writer.push(null);
  });
}

function createTower(path: string): Promise<void> {
  return GCodeWriterStream.toFile(path, (writer: Stream.Readable) => {
    const layerHeight: number = 10;
    const layers: number = 10;
    for (let i = 0; i < layers; i++) {
      writer.push([new GCODECommand('', {}, `layer ${i}`)]);
      writer.push(GCODEHelper.moveTo([], void 0, void 0, i * layerHeight));
      writer.push(GCODEHelper.square([], 0, 0, 100));
    }

    writer.push(GCODEHelper.moveTo([], 0, 0, -layerHeight * (layers - 1)));
    writer.push(null);
  });
}

function testGCODECommandConversion(): void {
  const cmd: GCODECommand = new GCODECommand('G0', { 'x': 10, 'z': 12.3 });
  const buffer: Uint8Array = new Uint8Array(1e4);
  let index: number = 0;
  index = cmd.toBinary(buffer, index);
  console.log(buffer.subarray(0, index));
}

// testGCODECommandConversion();

// createCircle('../assets/circle.gcode');
// createSquare('../assets/square.gcode');
// createTower('../assets/tower.gcode');
// createPlentySquare('../assets/plenty_square.gcode');

// console.log(GCODEHelper.moveTo([], 10, 10)[0].toString());
// console.log(GCODEHelper.arc([], 0, 0, 100, 1 / 4 * Math.PI, 3 / 4 * Math.PI, true, 100).map(a => a.toString()).join('\n'));

// GCODEHelper.parseFilePromise('../assets/' + 'thin_tower' + '.gcode');
// GCODEHelper.parseFile('../assets/' + 'fruit_200mm' + '.gcode');


