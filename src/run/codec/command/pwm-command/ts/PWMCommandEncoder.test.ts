import { codec } from '../../../../../classes/lib/codec/ts/helpers';
import { PWMCommand } from './PWMCommand';
import { PWMCommandEncoder } from './PWMCommandEncoder';
import { PWMCommandDecoder } from './PWMCommandDecoder';

async function test() {
  const pwm: PWMCommand = new PWMCommand(1, 0.5, 1.23);

  codec(new PWMCommandEncoder(pwm), new PWMCommandDecoder());
}


test();