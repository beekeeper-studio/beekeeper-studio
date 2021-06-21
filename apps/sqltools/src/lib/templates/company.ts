import { createdAtColumn, idColumn, Template, updatedAtColumn } from "./base";


export const CompanyTemplate = new Template({
  name: "Companies",
  description: "A table for storing company data in a website, app, or ERP",
  tableName: "companies"
}, [
  idColumn, createdAtColumn, updatedAtColumn
])