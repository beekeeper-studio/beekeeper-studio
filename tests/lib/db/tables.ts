import Knex from 'knex';


export function tableStatements(knex: Knex): string[] {
  const results = []

  results.push(knex.schema.createTable('addresses', (table) => {
    table.increments().primary()
    table.timestamps()
    table.string("street")
    table.string("city")
    table.string("state")
    table.string("country").notNullable()
  }).toQuery())


  results.push(knex.schema.createTable("people", (table) => {
    table.increments().primary()
    table.timestamps()
    table.string("firstname")
    table.string("lastname")
    table.string("email").notNullable()
    table.integer("address_id").notNullable().unsigned()
    table.foreign("address_id").references("addresses.id")
  }).toQuery())

  results.push(knex.schema.createTable("jobs", (table) => {
    table.increments().primary()
    table.timestamps()
    table.string("job_name").notNullable()
    table.decimal("hourly_rate")
  }).toQuery())

  results.push(knex.schema.createTable("people_jobs", (table) => {
    table.integer("job_id").notNullable().unsigned()
    table.integer("person_id").notNullable().unsigned()
    table.foreign("person_id").references("people.id")
    table.foreign("job_id").references("jobs.id")
    table.primary(['job_id', "person_id"])
    table.timestamps()
  }).toQuery())

  return results
  

}