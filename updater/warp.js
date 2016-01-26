export function crossTest (array) {
  let lonUnderMinus160 = false;
  let lonOverPlus160 = false;
  for (let i = 0; i < array.length; i++) {
    if (array[i][0] > 160) {
      lonOverPlus160 = true;
    } else if (array[i][0] < -160) {
      lonUnderMinus160 = true;
    }
  }

  return lonOverPlus160 && lonUnderMinus160;
}

export function warpArray (array) {
  let newArray = array.slice(0);
  for (var i = 0; i < newArray.length; i++) {
    if (newArray[i][0] < -170) {
      newArray[i][0] = newArray[i][0] + 360;
    }
  }

  return newArray;
}
