import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import {XRControllerModelFactory} from 'three/examples/jsm/webxr/XRControllerModelFactory';

import {colors} from './colors';
import {difficulties} from './game';
import {createMine, createNumber} from './objects';
import {playSound, Sounds} from './sounds';

export class View {
  scene = new Scene();
  grid = new Group();
  camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  playground = new Group();
  cubeSize = 0.03;
  gridSize = difficulties[0].gridSize;
  isInteractionDisabled: boolean;
  private isEndAnimationRunning: boolean;

  numberObjects: Object3D[] = [];

  constructor() {
    this.scene.add(this.playground);
  }

  setPlaygroundPosition() {
    let headsetPosition = new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    let {x, y, z} = headsetPosition;
    this.playground.position.set(x + 0.03, y - 0.1, z - 0.3);
    this.playground.rotation.set(0, 45 * (Math.PI / 180), 0);
  }

  rotateNumbersToCamera() {
    if (!this.isEndAnimationRunning) {
      let headsetPosition = new Vector3().setFromMatrixPosition(this.camera.matrixWorld);
      this.numberObjects.forEach((n) => n.children[0].lookAt(headsetPosition));
    }
  }

  swapCubeWithNumber(object: Mesh) {
    let number = createNumber(object.position, object.userData.minesCount + '', this.cubeSize, {...object.userData.coordinates});
    this.grid.remove(object);
    this.numberObjects.push(number);
    this.playground.add(number);
  }

  showMines() {
    this.grid.children
      .filter((i) => i.userData.isMine)
      .forEach((i) => {
        this.grid.remove(i);
        this.playground.add(createMine(i.position, this.cubeSize));
      });
  }

  reset(cubeObjects: Object3D[]) {
    this.playground.clear();
    this.grid.clear();
    this.playground.add(this.grid);

    this.numberObjects = [];
    this.runGridAnimation(cubeObjects);
  }

  private runGridAnimation(cubeObjects: Object3D[]) {
    this.isInteractionDisabled = true;
    playSound(Sounds.GRID_INITIALIZATION);
    let intervalTime = 2500 / Math.pow(this.gridSize, 3);

    let intervalId = setInterval(() => {
      let randomIndex = Math.floor(Math.random() * cubeObjects.length);
      this.grid.add(cubeObjects[randomIndex]);
      cubeObjects.splice(randomIndex, 1);

      if (!cubeObjects.length) {
        this.isInteractionDisabled = false;
        clearInterval(intervalId);
      }
    }, intervalTime);
  }

  runChainAnimation(cubesToDelete: Mesh[], cubesToSwap: Mesh[]) {
    this.isInteractionDisabled = true;
    playSound(Sounds.CHAIN_OPENING);

    let intervalId = setInterval(() => {
      this.grid.remove(cubesToDelete.shift());

      if (!cubesToDelete.length) {
        this.isInteractionDisabled = false;
        clearInterval(intervalId);

        let intervalId2 = setInterval(() => {
          this.swapCubeWithNumber(cubesToSwap.shift());

          if (!cubesToSwap.length) {
            this.isInteractionDisabled = false;
            clearInterval(intervalId2);
          }
        }, 50);
      }
    }, 50);
  }

  runEndAnimation() {
    // this.isEndAnimationRunning = true;
    // let animate = (obj) => {
    //   let coef = (Math.random() - 0.5) / 1000;
    //   let timeElapsed = 0;
    //   let v = (new Vector3()).copy(obj.position);
    //   obj.localToWorld(v);
    //   this.playground.worldToLocal(v);
    //   let intervalId = setInterval(() => {
    //     obj.rotateX(coef * 20);
    //     obj.rotateY(coef * 20);
    //     obj.rotateZ(coef * 20);
    //     obj.translateX(v.x / 100);
    //     obj.translateZ(v.z / 100);
    //     obj.translateY(v.y / 100);
    //     timeElapsed += 17
    //     if (timeElapsed >= 2500) {
    //       clearInterval(intervalId);
    //       this.isEndAnimationRunning = false
    //     }
    //   }, 17);
    // }
    // this.grid.children.concat(
    //   this.playground.children.filter((c: Mesh) => c.geometry?.type === 'TextGeometry' || c.geometry?.type === 'IcosahedronGeometry'))
    //   .forEach(obj => animate(obj))
  }

  buildControllers(renderer: WebGLRenderer): Group[] {
    const geometry = new BufferGeometry().setFromPoints([
      new Vector3(0, 0, 0.05),
      new Vector3(0, 0, -1),
    ]);

    const material = new LineBasicMaterial({color: colors.selector});
    const line = new Line(geometry, material);
    let selectorLength = 0.075;
    line.scale.z = selectorLength;
    line.material.linewidth = 5;
    const helperPoint = new Line(geometry, material);
    helperPoint.position.setZ(-0.075);
    helperPoint.scale.z = 0;

    const controllers = [];

    for (let i = 0; i <= 1; i++) {
      const controller = renderer.xr.getController(i);
      this.scene.add(controller);
      controller.add(line.clone());
      controller.add(helperPoint.clone());
      controller.userData.index = i;
      controller.userData.selectorLength = 0.075;

      controllers.push(controller);

      const grip = renderer.xr.getControllerGrip(i);
      const controllerModelFactory = new XRControllerModelFactory();
      grip.add(controllerModelFactory.createControllerModel(grip));
      this.scene.add(grip);
    }

    return controllers;
  }
}
