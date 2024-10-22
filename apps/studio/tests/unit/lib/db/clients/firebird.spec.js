import { FirebirdChangeBuilder } from "@shared/lib/sql/change_builder/FirebirdChangeBuilder"

describe("FirebirdChangeBuilder", () => {
  let builder
  beforeEach(() => {
    builder = new FirebirdChangeBuilder('beans')
  })

  it("test", (() => {
    const initArr = [
      {columnName: 'a', dataType: 'something'},
      {columnName: 'b', dataType: 'something'},
      {columnName: 'c', dataType: 'something'},
      {columnName: 'd', dataType: 'something'},
      {columnName: 'e', dataType: 'something'},
      {columnName: 'f', dataType: 'something'},
      {columnName: 'g', dataType: 'something'},
      {columnName: 'h', dataType: 'something'},
      {columnName: 'i', dataType: 'something'}
    ]

    const updatedArr = [
      {columnName: 'd', dataType: 'something'},
      {columnName: 'b', dataType: 'something'},
      {columnName: 'c', dataType: 'something'},
      {columnName: 'a', dataType: 'something'},
      {columnName: 'f', dataType: 'something'},
      {columnName: 'e', dataType: 'something'},
      {columnName: 'h', dataType: 'something'},
      {columnName: 'g', dataType: 'something'},
      {columnName: 'i', dataType: 'something'}
    ]

    const updatedArrStuff = [
      `ALTER TABLE beans ALTER d POSITION 1`,
      `ALTER TABLE beans ALTER a POSITION 4`,
      `ALTER TABLE beans ALTER f POSITION 5`,
      `ALTER TABLE beans ALTER e POSITION 6`,
      `ALTER TABLE beans ALTER h POSITION 7`,
      `ALTER TABLE beans ALTER g POSITION 8`
    ]

    expect(builder.reorderColumns(initArr, updatedArr)).toEqual(updatedArrStuff.join(';'))
  }))
})
