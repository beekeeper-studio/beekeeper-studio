/**
 * Transform an object and cast the values to the correct type.
 *
 * If the value is a number, cast it to a number.
 *
 * Otherwise, the value is a string.
 **/
function transform(obj) {
  const clone = Object.assign({}, obj);

  Object.keys(obj).forEach((key) => {
    if (typeof obj[key] === "object") {
      clone[key] = transform(obj[key]);
    } else {
      clone[key] = cast(obj[key]);
    }
  });

  return clone;
}

function cast(value) {
  if (isNumber(value)) {
    return Number(value);
  } else {
    return value;
  }
}

function isNumber(value) {
  return !Number.isNaN(Number(value));
}

// TODO run linter
module.exports = {
  transform,
};
