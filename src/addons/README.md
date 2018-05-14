
##PROTOCOL (version 0x01):

###COMMANDS SENT BY MASTER:
Every commands have the following structure:

- `CMD_ID` *(uint16)*: the id of the command (used to identify it in the queue).
`0xffff` reserved, to know if command should be executed immediatly or put in queue
- `CMD_CODE` *(uint8)*: the code of the command (what should be done)
- `...CMD_DATA`: extra data of the command

###ANSWERS SENT BY SLAVE:
First byte sent by slave is always the protocol version (ex: `0x01`), 
then every answers have to following structure:

- `CMD_ID` *(uint16)*: the id of the command which is finished.
`0xffff` reserved, in case of special interruptions from slave (ex: material default, etc...)
- `CMD_STATE` *(uint8)*: 
  - 0x00: if command succeed
  - != 0x00 if command failed
- `...CMD_DATA`: extra data of the answer


###LIST OF MASTER COMMANDS

#### STOP 0x00
Stop all actions, clear queue and reset all states.

Master data: NONE

Slave data: NONE


#### PAUSE 0x01
Pause all actions.

Master data: NONE

Slave data: NONE


#### RESUME 0x02
Resume all actions.

Master data: NONE

Slave data: NONE


#### SET PRECISION 0x03
Set precision for floats.

Master data: 
- `PRECISION` *(uint_8)*:
  - 0x00: float32
  - 0x01: float64

Slave data: NONE


#### GET CAPABILITIES 0x04
Returns a JSON structure of the capabilities of the machine (like steppers, axis, pwm channels, etc...).

Master data: NONE

Slave data:
- `...DATA_LENGTH` *(size)*: the length of the data
- `...JSON`: the json data


#### READ INPUTS 0x05
Read the slave inputs.
Master data: NONE

Slave data:
- `PIN_STATES` *(uint_16)*: the states of the input pins.
- `...ADC_VALUES` *(x8)*:
  - `ADC_VALUE` *(uint_16)*: the value of the ADC for channel `i`

              


#### DEFINE ENDSTOPS 0x06
Define the endstops for limits detection (like homing or machine default).

Master data:
- `PIN_AND_AXIS` *(uint_8)*:
  - `PIN` *(4bits)*: the input pin to listen to (0 -> 15)
  - `AXIS` *(3bits)*: the axis (0 -> 7)
  - `ACTIVE_STATE` *(1bit)*: the state in which the endstop is triggered

Slave data: NONE


#### HOME 0x07
Home axis.

Master data:
- `PIN_MASK` *(uint_8)*: inform which pins/axis will be homed.

Slave data: NONE


#### PWM 0x08
Set a PWM. If value equals 0, disable pwm.
    
Master data:
- `PIN` *(uint_8)*: the pin of the PWM (0 -> 7)
- `VALUE` *(float32|float64)*: the fraction of time for which the pin is HIGH
- `PERIOD` *(float32|float64)*: the period of the PWM in seconds (invert of frequency)

Slave data: NONE


#### ENABLE_STEPPERS 0x09
Active steppers.

Master data:
- `STATES` *(uint_8)*: inform which pins/axis should be activated.

Slave data: NONE


#### MOVE 0x0A
Do a coordinated move. Slave answer when move is done.
    
Master data:
- `PIN_MASK` *(uint_8)*: inform which pins/axis will be used.
- `DURATION` *(float32|float64)*: the duration in seconds of the move
- `INITIAL_SPEED` *(float32|float64)*: the initial speed of the move
- `ACCELERATION` *(float32|float64)*: the acceleration of the move
- `...MOVEMENTS` *(xN)*: a list of N movements (N = number of bits set to one in `PIN_MASK`)
  - `DISTANCE` *(int_32)*: the distance in steps (positive or negative) of the move on axis `i`

Slave data: NONE






# TODO


