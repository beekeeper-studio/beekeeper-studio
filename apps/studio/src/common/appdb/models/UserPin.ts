import { ApplicationEntity } from "./application_entity";
import { Entity, Column, BeforeInsert, BeforeUpdate } from "typeorm";
import bcrypt from "bcryptjs";

const saltRounds = 12;

@Entity({ name: "user_pins" })
export class UserPin extends ApplicationEntity {
  @Column({ type: "text", nullable: false })
  hash!: string;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPins() {
    if (this.hash) {
      this.hash = await bcrypt.hash(this.hash, saltRounds);
    }
  }

  withProps(props: any): UserPin {
    if (props) UserPin.merge(this, props);
    return this;
  }

  static async updatePin(currentPin: string, newPin: string): Promise<UserPin> {
    const userPin = await UserPin.findOne({});

    if (!userPin) {
      throw new Error("No pin found");
    }

    const isCurrentPinValid = await userPin.verifyPin(currentPin);
    if (!isCurrentPinValid) {
      throw new Error("Current pin is incorrect");
    }

    userPin.hash = await bcrypt.hash(newPin, saltRounds);

    return await userPin.save();
  }

  async verifyPin(pin: string): Promise<boolean> {
    return await bcrypt.compare(pin, this.hash);
  }
}
