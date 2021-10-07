export const lightTheme = {
  1: 0x4d63ff,
  2: 0x22fd54,
  3: 0xf94848,
  4: 0x2d3a93,
  5: 0x821e1e,
  6: 0x298a9b,
  7: 0x091011,
  8: 0x091011,
  9: 0x091011,
  10: 0x091011,
  mine: 0x454545,
  edges: 0xb3b3b3,
  markedEdges: 0xbf4e4e,
  selector: 0x545454,
  cube: 0x6e6c6b,
  background: '#cfcfcf'
};

export const darkTheme = {
  1: 0x4d63ff, 
  2: 0x22fd54,
  3: 0xf94848,
  4: 0x2d3a93,
  5: 0x821e1e,
  6: 0x298a9b,
  7: 0x091011,
  8: 0x091011,
  9: 0x091011,
  10: 0x091011,
  mine: 0x171717,
  edges: 0x383838,
  markedEdges: 0xbf4e4e,
  selector: 0xb3b3b3,
  cube: 0xcfcfcf,
  background: '#222326'
}

export const colors = {...darkTheme};

export function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
