import { ApplicationEntity } from "./application_entity";
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import bcrypt from "bcryptjs";
import bksConfig from "@/common/bksConfig";

const saltRounds = 12;

@Entity({ name: "user_pins" })
export class UserPin extends ApplicationEntity {
  @Column({ type: "text", nullable: false })
  hash!: string;

  withProps(props: any): UserPin {
    if (props) UserPin.merge(this, props);
    return this;
  }

  static async createPin(pin: string): Promise<UserPin> {
    if ((await UserPin.count()) > 0) {
      throw new Error("Cannot create a new pin. A pin already exists. You can only update an existing pin.");
    }

    if (pin.length < bksConfig.security.minPinLength) {
      throw new Error(`Pin must be at least ${bksConfig.security.minPinLength} characters long`);
    }

    const userPin = new UserPin();
    userPin.hash = await bcrypt.hash(pin, saltRounds);
    return await userPin.save();
  }

  static async updatePin(oldPin: string, newPin: string): Promise<UserPin> {
    const userPin = (await UserPin.find())[0];

    if (!userPin) {
      throw new Error("No pin found");
    }

    const isOldPinCorrect = await UserPin.verifyPin(oldPin, userPin);
    if (!isOldPinCorrect) {
      throw new Error("Old pin is incorrect");
    }

    if (newPin.length < bksConfig.security.minPinLength) {
      throw new Error(`Pin must be at least ${bksConfig.security.minPinLength} characters long`);
    }

    userPin.hash = await bcrypt.hash(newPin, saltRounds);

    return await userPin.save();
  }

  static async verifyPin(pin: string, userPin?: UserPin): Promise<boolean> {
    if ((await UserPin.count()) === 0) {
      throw new Error("No pin found.");
    }
    if (!userPin) {
      userPin = (await UserPin.find())[0];
    }
    return await bcrypt.compare(pin, userPin.hash);
  }
}
