import { codec } from '../../../../classes/lib/codec/ts/helpers';
import { PWM } from './PWM';
import { PWMEncoder } from './PWMEncoder';
import { PWMDecoder } from './PWMDecoder';

async function test() {
  const pwm: PWM = new PWM(1, 0.5, 1.23);

  codec(new PWMEncoder(pwm), new PWMDecoder());
}


test();