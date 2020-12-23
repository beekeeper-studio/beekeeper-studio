import { parseRoutineParams } from '../../../../../src/lib/db/clients/postgresql'


describe("Postgres UNIT tests (no connection required)", () => {

  it('Should parse function params properly', async () => {
    const testcases = [
      ['text, text', [{ type: 'text', name: 'arg_1'}, {type: 'text', name: 'arg_2'}]],
      ['p_film_id integer, p_store_id integer, OUT p_film_count integer', [
        {name: 'p_film_id', type: 'integer'},
        {name: 'p_store_id', type: 'integer'},
        {name: 'OUT p_film_count', type: 'integer'}
      ]],

      [
        'p_customer_id integer, p_effective_date timestamp without time zone',
        [
          { name: 'p_customer_id', type: 'integer' },
          { name: 'p_effective_date', type: 'timestamp without time zone' }
        ]
      ],
      [
        'text',
        [
          { name: 'arg_1', type: 'text'}
        ]
      ],
      [
        'p_inventory_id some bananas type with a lot of parts',
        [
          { name: 'p_inventory_id', type: 'some bananas type with a lot of parts' }
        ]
      ],
      [
        'timestamp without timezone',
        [
          { name: 'arg_1', type: 'timestamp without timezone' }
        ]
      ],
      [
        'min_monthly_purchases integer, min_dollar_amount_purchased numeric',
        [
          { name: 'min_monthly_purchases', type: 'integer'},
          { name: 'min_dollar_amount_purchased', type: 'numeric'}
        ]
      ],
      [
        'OUT timestamp without timezone',
        [
          { name: 'OUT', type: 'timestamp without timezone'}
        ]
      ]
    ]
    testcases.forEach((tc) => {
      const result = parseRoutineParams(tc[0])
      expect(result).toMatchObject(tc[1])
    })
  })
})