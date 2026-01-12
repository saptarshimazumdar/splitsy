const divideMoney = (price, num, precision = 2) => {
    return round(price/num, precision);
}

const round = (num, precision = 2) => {
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

const validEmpty = (arr) => arr?.length ? arr : undefined;

const backup = (data) => btoa(JSON.stringify(data));

const restore = (data) => JSON.parse(atob(data));

const replaceLastOccurrence = (str, find, replace) => {
  const lastIndex = str.lastIndexOf(find); // Find the index of the last match
  
  if (lastIndex === -1) { // If no match is found, return the original string
    return str;
  }
  
  // Rebuild the string: part before the match + replacement + part after the match
  return str.slice(0, lastIndex) + replace + str.slice(lastIndex + find.length);
}