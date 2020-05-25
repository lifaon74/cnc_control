

/** INTERFACES **/

export interface IGCODECommandOptions {
  command?: string;
  params?: Iterable<[string, number]>;
  comment?: string;
}

export interface IGCODECommandConstructor {
  new(options?: IGCODECommandOptions): IGCODECommand;
}

export interface IGCODECommand extends IGCODECommandOptions {
  command: string;
  params: Map<string, number>;
  comment: string;

  isEmpty(): boolean;

  toGCodeString(precision?: number): string;
}

/** IMPLEMENTATION **/

/** METHODS **/

export const GCODE_LINE_REXGEXP: RegExp = /^([^;]*)(?:;(.*)$|$)/;
export const GCODE_PARAM_REXGEXP: RegExp = /^([a-zA-Z])([0-9.\-]+)/;

/* METHODS */

export function GCODECommandIsEmpty(instance: IGCODECommand): boolean {
  return (instance.command === '')
   && (instance.params.size === 0)
   && (instance.comment === '');
}

export function GCODECommandToGCodeString(instance: IGCODECommand, precision: number = 2): string {
  let commandLine: string = '';
  if (instance.command) {
    commandLine += instance.command;
  }

  const iterator: IterableIterator<[string, number]> = instance.params.entries();
  let result: IteratorResult<[string, number]>;
  while (!(result = iterator.next()).done) {
    if (commandLine !== '') {
      commandLine += ' ';
    }
    const [key, value]: [string, number] = result.value;
    commandLine += key.toUpperCase() + value.toFixed(precision);
  }

  if (instance.comment) {
    if (commandLine !== '') {
      commandLine += ' ';
    }
    commandLine += '; ' + instance.comment;
  }

  return commandLine;
}

/* STATIC METHODS */

export function GCODECommandStaticFromString(
  _constructor: IGCODECommandConstructor,
  gcodeLine: string
): IGCODECommand {
  const command: GCODECommand = new GCODECommand();

  const match: RegExpExecArray | null = GCODE_LINE_REXGEXP.exec(gcodeLine.trim());
  if (match !== null) {
    if (match[1]) {
      const split = match[1].split(' ');
      command.command = split[0].trim();
      let param: string;
      for (let i = 1, l = split.length; i < l; i++) {
        param = split[i].trim();
        if (param !== '') {
          const paramMatch: RegExpExecArray | null = GCODE_PARAM_REXGEXP.exec(param);
          if (paramMatch !== null) {
            command.params.set(paramMatch[1].toLowerCase(), parseFloat(paramMatch[2]));
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


/** CLASS **/

export class GCODECommand implements IGCODECommand {
  static fromString(gcodeLine: string): IGCODECommand {
    return GCODECommandStaticFromString(this, gcodeLine);
  }

  public command: string;
  public params: Map<string, number>;
  public comment: string;

  constructor(options: IGCODECommandOptions = {}) {
    this.command = (options.command === void 0)
      ? ''
      : options.command;

    this.params = (options.params === void 0)
      ? new Map<string, number>()
      : (
        (options.params instanceof Map)
          ? options.params
          : new Map<string, number>(options.params)
      );

    this.comment = (options.comment === void 0)
      ? ''
      : options.comment;
  }

  isEmpty(): boolean {
    return GCODECommandIsEmpty(this);
  }

  toGCodeString(precision?: number): string {
    return GCODECommandToGCodeString(this, precision);
  }
}
