import * as yup from 'yup'

let configSchema = yup.object().shape({
  name: yup.string().required().label("Connection Name"),
  host: yup.string().required().label("Host Name"),
  port: yup.number().required().positive().integer().label("Port"),
  user: yup.string().nullable().label("Username"),
  password: yup.string().nullable().label("Password")
})

export default {
  async config(connectionConfig) {
    try {
      const result = await configSchema.validate(connectionConfig, {abortEarly: false})
      return { result, errors: null, valid: true }
    } catch(ex) {
      return { result: null, errors: ex.errors, valid: false }
    }
  }
}
