import _ from 'lodash';
import { UserPin } from '@/common/appdb/models/UserPin';
import { waitPromise } from '@/common/utils';

export interface ILockHandlers {
  'lock/isSet': () => Promise<boolean>,
  'lock/create': ({ pin }: { pin: string }) => Promise<void>
  'lock/update': ({ oldPin, newPin }: { oldPin: string, newPin: string }) => Promise<void>
}

export const LockHandlers: ILockHandlers = {
  'lock/isSet': async function() {
    return await UserPin.count() > 0;
  },
  'lock/create': async function({ pin }: { pin: string }) {
    await UserPin.createPin(pin);
  },
  'lock/update': async function({ oldPin, newPin }: { oldPin: string, newPin: string }) {
    await waitPromise(1000);
    await UserPin.updatePin(oldPin, newPin);
  }
}
