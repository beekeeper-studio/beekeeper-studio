



export function yesNoFormatter(cell: any){
  let result = 'NO'
  if (cell.getValue() === true) result = 'YES'
  return `<div class="yesno-select">${result}</div>`
}