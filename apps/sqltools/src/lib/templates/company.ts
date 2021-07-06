import { createdAtColumn, idColumn, Template, updatedAtColumn } from "./base";


export const CompanyTemplate = new Template({
  name: "Companies",
  description: "A table for storing company data in a website, app, or ERP",
  tableName: "companies"
}, [
  idColumn, 
  {
    columnName: 'name',
    config: {
      dataType: 'varchar(255)',
      nullable: false
    }
  },
  {
    columnName: 'address1',
    config: {
      dataType: 'varchar(255)',
      nullable: false
    }
  },
  {
    columnName: 'city',
    config: {
      dataType: 'varchar(255)',
      nullable: false
    }
  },
  {
    columnName: 'state_or_province',
    config: {
      dataType: 'varchar(255)',
      nullable: false
    }
  },
  {
    columnName: 'zip_or_postcode',
    config: {
      dataType: 'varchar(255)',
      nullable: true,
      comment: "may not apply in some parts of the world"

    }
  },
  {
    columnName: 'country_code',
    config: {
      dataType: 'char(2)',
      nullable: false,
      comment: "ISO 3166 alpha-2 country code"
    }
  },
  
  createdAtColumn, updatedAtColumn
])