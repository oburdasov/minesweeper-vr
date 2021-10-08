import {
  Euler,
  Geometry,
  Group,
  Intersection,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  Raycaster,
  Vector3,
  WebGLRenderer,
  XRInputSource,
} from 'three';
import {colors, darkTheme, getRandomColor, lightTheme} from './colors';
import {Game} from './game';
import {toggleFlag} from './objects';
import {playSound, Sounds} from './sounds';
import {View} from './view';

const raycaster = new Raycaster();
const workingMatrix = new Matrix4();

let isDarkTheme = true;

export class Controls {
  private controllers: Group[];
  private selectedCubes = [];
  private intersectedNumbers = [];

  private controllerInitialMatrix: Matrix4;
  private playgroundInitialMatrix: Matrix4;

  private selectPressedTime: number;
  private isHoveredOnSelectStart;

  private initialDistanceBetweenControllers: number;
  private initialPositionBetweenControllers: Vector3;

  private isButtonAPressed: boolean;
  private isButtonBPressed: boolean;
  private isLeftButtonAPressed: boolean;
  private isLeftButtonBPressed: boolean;

  constructor(private view: View, private game: Game, private renderer: WebGLRenderer) {
    this.controllers = view.buildControllers(renderer);
    this.setupControllerEvents();
  }

  checkControllers() {
    this.controllers.forEach((controller) => this.handleController(controller));
  }

  private setupControllerEvents() {
    this.controllers.forEach((controller) => {
      controller.addEventListener('selectstart', () => {
        controller.userData.selectPressed = true;
        this.selectPressedTime = +(new Date());
        this.isHoveredOnSelectStart = !!this.selectedCubes[controller.userData.index];
      });
      controller.addEventListener('selectend', () => {
        controller.userData.selectPressed = false;
        if (!this.view.isInteractionDisabled) {
          this.handleClick(controller);
        }
      });
      controller.addEventListener('squeezestart', (event) => {
        controller.userData.squeezePressed = true;
        if (!this.controllerInitialMatrix) {
          this.controllerInitialMatrix = event.target.matrixWorld.clone();
          this.playgroundInitialMatrix = this.view.playground.matrixWorld.clone();
        }
      });
      controller.addEventListener('squeezeend', () => {
        controller.userData.squeezePressed = false;

        if (this.controllers.some((i) => !i.userData.squeezePressed)) {
          this.controllerInitialMatrix = null;
        }

        this.initialDistanceBetweenControllers = null;
        this.initialPositionBetweenControllers = null;
      });
    });
  }

  updateSelectorLength(source: XRInputSource) {
    let controller = this.controllers[source.handedness === 'left' ? 0 : 1];
    controller.userData.selectorLength = Math.max(
      controller.userData.selectorLength - source.gamepad.axes[3] / 500,
      0.025
    );
    controller.children[0].scale.z = controller.userData.selectorLength;
    controller.children[1].position.z = -controller.userData.selectorLength;

    let intersects = this.getIntersectedCubes(controller);
    let selected = this.selectedCubes[controller.userData.index];

    if (selected && intersects[0]?.distance > controller.userData.selectorLength) {
      selected.object.material.opacity = 0.4;
      selected.object.scale.set(1, 1, 1);
    }
  }

  private randomizeColors() {
    Object.keys(colors).forEach((key) => (colors[key] = getRandomColor()));
    this.renderer.setClearColor(colors.background);
    this.updateSelectorsColor();
    this.game.restart();
  }
  
  private toggleTheme() {
    isDarkTheme = !isDarkTheme;
    Object.keys(colors).forEach(
      (key) => (colors[key] = isDarkTheme ? darkTheme[key] : lightTheme[key])
    );
    this.renderer.setClearColor(colors.background);
    this.game.restart();
    this.updateSelectorsColor();
  }

  handleButtons(source: XRInputSource,) {
    if (source.handedness === 'right') {
      if (source.gamepad.buttons[4]?.pressed) {
        if (!this.isLeftButtonAPressed && !this.view.isInteractionDisabled) {
          this.toggleTheme();
        }
        this.isButtonAPressed = true;
      } else {
        this.isButtonAPressed = false;
      }

      if (source.gamepad.buttons[5]?.pressed) {
        if (!this.isButtonBPressed && !this.view.isInteractionDisabled) {
          this.game.changeDifficulty();
        }
        this.isButtonBPressed = true;
      } else {
        this.isButtonBPressed = false;
      }
    }

    if (source.handedness === 'left') {
      if (source.gamepad.buttons[4]?.pressed) {
        if (!this.isButtonAPressed && !this.view.isInteractionDisabled) {
          this.randomizeColors();
        }
        this.isLeftButtonAPressed = true;
      } else {
        this.isLeftButtonAPressed = false;
      }

      if (source.gamepad.buttons[5]?.pressed) {
        if (!this.isLeftButtonBPressed) {
          this.view.setPlaygroundPosition();
        }
        this.isLeftButtonBPressed = true;
      } else {
        this.isLeftButtonBPressed = false;
      }
    }
  }

  private updateSelectorsColor() {
    this.controllers.forEach((c: any) => c.children[0].material.color.set(colors.selector));
  }

  private getIntersectedCubes(controller: Group): Intersection[] {
    workingMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);

    return raycaster.intersectObjects(this.view.grid?.children);
  }

  private getIntersectedNumbers(controller: Group): Intersection[] {
    workingMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.children[0].matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);

    return raycaster.intersectObjects(this.view.playground?.children.filter(obj => obj.name === 'number-box'));
  }

  private getClosestObject(intersects: Intersection[], controller: Group) {
    let selectorPointPosition = new Vector3().setFromMatrixPosition(controller.children[1].matrixWorld)

    return intersects.sort((a, b) => {
      let aPosition = new Vector3().setFromMatrixPosition(a.object.children[0].matrixWorld);
      let bPosition = new Vector3().setFromMatrixPosition(b.object.children[0].matrixWorld);

      return aPosition.distanceTo(selectorPointPosition) - bPosition.distanceTo(selectorPointPosition);
    })[0];
  }

  private handleController(controller: Group) {
    let selectedCube = this.selectedCubes[controller.userData.index];
    let intersects = this.getIntersectedCubes(controller).concat(this.getIntersectedNumbers(controller));
    let closest = this.getClosestObject(intersects, controller);

    let intersectedNumber = this.intersectedNumbers[controller.userData.index];
    if (
      intersectedNumber &&
      ((closest && intersectedNumber.object.id !== closest?.object.id) || !intersects.length)
    ) {
      this.unhoverNumber(controller);
      this.removeCubesHighlight();
    }

    if (closest?.object.name === 'number-box') {
      if (intersects.length > 0 && closest.distance < controller.userData.selectorLength && !this.view.isEndAnimationRunning) {
        const object = closest.object.children[0] as Mesh<Geometry, Material>;
        object.material.opacity = 1;
        object.scale.set(1.5, 1.5, 1.5);
        this.intersectedNumbers[controller.userData.index] = closest;
  
        if (controller.userData.selectPressed) {
          this.getNonAdjacentCubes(closest.object).forEach((cube: any) => cube.material.opacity = 0.1);
        } else {
          this.removeCubesHighlight();
        }
      }

      if (selectedCube) {
        this.unhoverCube(controller, selectedCube);
      }
    } else {

      if (
        selectedCube &&
        ((closest && selectedCube.object.id !== closest?.object.id) || !intersects.length)
      ) {
        this.unhoverCube(controller, selectedCube);
      }
  
      if (intersects.length > 0 && closest.distance < controller.userData.selectorLength && !this.view.isEndAnimationRunning) {
        const object = closest.object as Mesh<Geometry, Material>;
        object.material.opacity = 1;
        object.scale.set(1.2, 1.2, 1.2);
        this.unhoverNumber(controller);
  
        if (this.selectedCubes[controller.userData.index]?.object.id !== closest.object.id) {
          playSound(Sounds.HOVER);
        }
        this.selectedCubes[controller.userData.index] = closest;
      }

      if (
        controller.userData.selectPressed &&
        selectedCube &&
        this.isHoveredOnSelectStart &&
        Date.now() - this.selectPressedTime > 500 &&
        !this.view.isInteractionDisabled
      ) {
        toggleFlag(selectedCube.object);
        this.selectPressedTime = Date.now() + 6.048e8;
      }

    }

    if (controller.userData.squeezePressed) {
      this.handleSqueeze(controller);
    }
  }

  private removeCubesHighlight() {
    this.view.grid.children.forEach((cube: any) => cube.material.opacity = 0.4);
  }

  private unhoverCube(controller, selectedCube) {
    selectedCube.object.material.opacity = selectedCube.object.userData.markedMine ? 0.7 : 0.4;
    selectedCube.object.scale.set(1, 1, 1);
    this.selectedCubes[controller.userData.index] = null;
  }

  private unhoverNumber(controller) {
    let intersectedNumber = this.intersectedNumbers[controller.userData.index];
    if (intersectedNumber) {
      intersectedNumber.object.children[0].scale.set(1, 1, 1);
      intersectedNumber.object.children[0].material.opacity = 0.7;
      this.intersectedNumbers[controller.userData.index] = null;
    }
  }

  private getNonAdjacentCubes(numBox): Object3D[] {
    return this.view.grid.children.filter(cube => {
      return Math.abs(cube.userData.coordinates.x - numBox.userData.coordinates.x) > 1 || 
      Math.abs(cube.userData.coordinates.y - numBox.userData.coordinates.y) > 1 || 
      Math.abs(cube.userData.coordinates.z - numBox.userData.coordinates.z) > 1
    })
  }

  private handleClick(controller) {
    let selected = this.selectedCubes[controller.userData.index];
    if (
      selected &&
      !selected.object.userData.markedMine &&
      this.isHoveredOnSelectStart &&
      selected.object.material.opacity === 1 &&
      Date.now() - this.selectPressedTime > -10000000
    ) {
      let selectedObject = this.view.grid.getObjectById(selected.object.id) as any;

      if (selectedObject) {
        if (this.game.isFirstMove()) {
          this.game.markFirstMove(selectedObject);
        }

        if (selectedObject.userData.isMine) {
          this.view.isInteractionDisabled = true;
          this.game.gameover(selectedObject);
        } else if (selectedObject.userData.minesCount) {
          playSound(Sounds.SELECT);
          this.view.swapCubeWithNumber(selected.object);
          if (this.view.grid.children.length === this.game.totalMines) {
            this.view.isInteractionDisabled = true;
            this.game.victory();
          }
        } else {
          playSound(Sounds.SELECT);
          this.game.openEmptyCubes(selectedObject);
        }
      }
    }
  }

  private bothControllersSqueezed(): boolean {
    return this.controllers.every((i) => i.userData.squeezePressed);
  }

  private handleSqueeze(controller: Object3D) {
    if (this.bothControllersSqueezed()) {
      this.handleDoubleSqueeze();
    } else if (this.controllerInitialMatrix) {
      let controllerPosition = new Vector3().setFromMatrixPosition(this.controllerInitialMatrix);
      let playgroundInitialPosition = new Vector3().setFromMatrixPosition(
        this.playgroundInitialMatrix
      );
      let positionDifference = controller.position.sub(controllerPosition);

      this.view.playground.position.set(
        playgroundInitialPosition.x + positionDifference.x,
        playgroundInitialPosition.y + positionDifference.y,
        playgroundInitialPosition.z + positionDifference.z
      );

      let controllerRotation = new Euler().setFromRotationMatrix(this.controllerInitialMatrix);

      let axis = new Vector3();
      controller.getWorldDirection(axis);
      this.view.playground.rotateOnWorldAxis(axis.normalize(), Math.max(Math.min((controller.rotation.z - controllerRotation.z) / 25, 0.05), -0.05));
    }
  }

  private handleDoubleSqueeze() {
    if (!this.initialDistanceBetweenControllers) {
      this.initialDistanceBetweenControllers = this.getDistanceBetweenControllers();
      this.initialPositionBetweenControllers = this.getPositionBetweenControllers();
      this.playgroundInitialMatrix = this.view.playground.matrixWorld.clone();
    }

    let playgroundInitialPosition = new Vector3().setFromMatrixPosition(
      this.playgroundInitialMatrix
    );

    let coef = (this.getDistanceBetweenControllers() - this.initialDistanceBetweenControllers) * 2;
    let scale = new Vector3().setFromMatrixScale(this.playgroundInitialMatrix);
    this.view.playground.scale
      .set(scale.x + coef, scale.y + coef, scale.z + coef)
      .max(new Vector3(0.4, 0.4, 0.4))
      .min(new Vector3(1.3, 1.3, 1.3));

    let positionDifference = this.getPositionBetweenControllers().sub(
      this.initialPositionBetweenControllers
    );

    this.view.playground.position.set(
      playgroundInitialPosition.x + positionDifference.x,
      playgroundInitialPosition.y + positionDifference.y,
      playgroundInitialPosition.z + positionDifference.z
    );
  }

  private getDistanceBetweenControllers(): number {
    return this.controllers[0].position.distanceTo(this.controllers[1].position);
  }

  private getPositionBetweenControllers(): Vector3 {
    return new Vector3()
      .addVectors(this.controllers[0].position, this.controllers[1].position)
      .divideScalar(2);
  }
}
