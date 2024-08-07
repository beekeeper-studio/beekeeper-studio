# vue2-datepicker scss 
the datepicker vendor files were all taken from vue2-datepicker's scss files because of a problem importing scss files through webpack (error was: You may not @extend an outer selector from within @media)

These were all taken from version 3.11.1

[NPM vue2-datepicker](https://www.npmjs.com/package/vue2-datepicker)

## Notes
At line 289 of index.scss, the @extend had to be removed and replaced with what it was extending `@extend .#{$namespace}-calendar-header;` in order to not throw a `You may only @extend selectors within the same directive` error any longer.