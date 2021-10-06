export const enum Sounds {
  GAME_OVER,
  VICTORY,
  SELECT,
  HOVER,
  MARK,
  UNMARK,
  GRID_INITIALIZATION,
  CHAIN_OPENING,
}

export const sounds = [];
sounds[Sounds.GAME_OVER] = new Audio(require('./assets/mine.wav').default);
sounds[Sounds.VICTORY] = new Audio(require('./assets/victory.wav').default);
sounds[Sounds.SELECT] = new Audio(require('./assets/pick.wav').default);
sounds[Sounds.HOVER] = new Audio(require('./assets/hover.wav').default);
sounds[Sounds.MARK] = new Audio(require('./assets/mark.wav').default);
sounds[Sounds.UNMARK] = new Audio(require('./assets/unmark.wav').default);
sounds[Sounds.GRID_INITIALIZATION] = new Audio(require('./assets/grid-initialization.wav').default);
sounds[Sounds.CHAIN_OPENING] = new Audio(require('./assets/chain-opening.wav').default);

sounds[Sounds.HOVER].volume = 0.5;
sounds[Sounds.GAME_OVER].volume = 0.8;

export function playSound(name: Sounds) {
  sounds[name].currentTime = 0;
  sounds[name].play();
}
