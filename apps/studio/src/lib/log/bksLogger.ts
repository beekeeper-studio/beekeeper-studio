import mainLog from "./mainLogger";
import utilLog from "./utilityLogger";

function isUtility() {
  return process.type === 'utility'
}

const result = isUtility() ? utilLog() : mainLog();

export default result;
