
import os from 'os'
import path from 'path'

console.log(os.homedir())

export default {
  userDirectory: path.join(os.homedir(), ".beekeeper-studio")
}
