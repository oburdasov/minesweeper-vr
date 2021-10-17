import {WebGLRenderer} from 'three';
import {VRButton} from 'three/examples/jsm/webxr/VRButton.js';

import {colors} from './colors';
import {Controls} from './controls';
import {Game} from './game';
import {View} from './view';

const renderer = new WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(colors.background);
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

const view: View = new View();
const game: Game = new Game(view);
const controls: Controls = new Controls(view, game, renderer);

let isSessionStarted: boolean;

renderer.setAnimationLoop(function () {
  if (renderer.xr.isPresenting && !isSessionStarted) {
    isSessionStarted = true;
    setTimeout(() => view.setPlaygroundPosition());
    game.setupGrid();
  }

  controls.checkControllers();
  view.rotateNumbersToCamera();

  controls.inputSources = renderer.xr.getSession()?.inputSources;
  controls.inputSources?.forEach((s) => {
    if (s.gamepad?.axes[3]) {
      controls.updateSelectorLength(s);
    }

    controls.handleButtons(s);
  });

  renderer.render(view.scene, view.camera);
});
