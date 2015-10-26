import Valida from 'valida';


const VALID_CLIETNS = [ 'mysql', 'postgresql' ];


function serverAddressValidator(ctx) {
  const { host, port, socketPath } = ctx.obj;
  if ((!host && !port && !socketPath) || ((host || port) && socketPath)) {
    return {
      validator: 'serverAddressValidator',
      msg: 'You must use host+port or socket path',
    };
  }

  if (socketPath) { return undefined; }

  if ((host && !port) || (!host && port)) {
    return {
      validator: 'serverAddressValidator',
      msg: 'Host and port are required fields.',
    };
  }
}


function clientValidator(ctx, options, value) {
  if (typeof value === 'undefined' || value === null) { return undefined; }
  if (!~VALID_CLIETNS.indexOf(ctx.obj.client)) {
    return {
      validator: 'clientValidator',
      msg: 'Invalid client type',
    };
  }
}


const SSH_SCHEMA = {
  host: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.len, min: 1, max: 250 },
  ],
  port: [
    { sanitizer: Valida.Sanitizer.toInt },
    { validator: Valida.Validator.len, min: 1, max: 5 },
  ],
  user: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: Valida.Validator.len, min: 1, max: 55 },
  ],
  password: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.len, min: 1, max: 55 },
  ],
  privateKey: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.len, min: 1, max: 250 },
  ],
};


const SERVER_SCHEMA = {
  name: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: Valida.Validator.len, min: 1, max: 250 },
  ],
  client: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: clientValidator },
  ],
  host: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.len, min: 1, max: 250 },
    { validator: serverAddressValidator },
  ],
  port: [
    { sanitizer: Valida.Sanitizer.toInt },
    { validator: Valida.Validator.len, min: 1, max: 5 },
    { validator: serverAddressValidator },
  ],
  socketPath: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.len, min: 1, max: 250 },
    { validator: serverAddressValidator },
  ],
  database: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: Valida.Validator.len, min: 1, max: 100 },
  ],
  user: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: Valida.Validator.len, min: 1, max: 55 },
  ],
  password: [
    { sanitizer: Valida.Sanitizer.trim },
    { validator: Valida.Validator.required },
    { validator: Valida.Validator.len, min: 1, max: 55 },
  ],
  ssh: [
    { validator: Valida.Validator.schema, schema: SSH_SCHEMA },
  ],
};


/**
 * validations applied on creating/updating a server
 */
export async function validate(server) {
  const validated = await Valida.process(server, SERVER_SCHEMA);
  if (!validated.isValid()) { throw validated.invalidError(); }
}
