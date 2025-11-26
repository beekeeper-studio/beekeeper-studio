import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";
import { LicenseKey } from "../models/LicenseKey";
import platformInfo from'@/common/platform_info';

export function ReadOnlyOrDefault(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'readOnlyOrDefault',
      async: true,
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (platformInfo.testMode) return true;

          const status = await LicenseKey.getLicenseStatus();
          const canSaveReadOnly = status.isUltimate;

          if (canSaveReadOnly) {
            return true;
          }

          if (value === true) {
            (args.object as any).readOnlyMode = false;
          }

          return true;
        }
      }
    })
  }
}
