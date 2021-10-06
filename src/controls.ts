import {
  Euler,
  Geometry,
  Group,
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

  private controllerInitialMatrix: Matrix4;
  private playgroundInitialMatrix: Matrix4;

  private selectPressedTime: number;
  private isHoveredOnSelectStart;

  private initialDistanceBetweenControllers: number;
  private initialPositionBetweenControllers: Vector3;

  private isButtonAPressed: boolean;
  private isButtonBPressed: boolean;
  private isLeftButtonAPressed: boolean;

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
    let controller = this.controllers[source.handedness === 'right' ? 0 : 1];
    controller.userData.selectorLength = Math.max(
      controller.userData.selectorLength - source.gamepad.axes[3] / 500,
      0.025
    );
    controller.children[0].scale.z = controller.userData.selectorLength;

    let intersects = this.getIntersects(controller);
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
        if (!this.isButtonAPressed && !this.view.isInteractionDisabled) {
          this.randomizeColors();
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
        if (!this.isLeftButtonAPressed && !this.view.isInteractionDisabled) {
          this.toggleTheme();
        }
        this.isLeftButtonAPressed = true;
      } else {
        this.isLeftButtonAPressed = false;
      }
    }
  }

  private updateSelectorsColor() {
    this.controllers.forEach((c: any) => c.children[0].material.color.set(colors.selector));
  }

  private getIntersects(controller: Group) {
    workingMatrix.identity().extractRotation(controller.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(workingMatrix);

    return raycaster.intersectObjects(this.view.grid?.children);
  }

  private handleController(controller: Group) {
    let selected = this.selectedCubes[controller.userData.index];

    let intersects = this.getIntersects(controller);

    if (
      selected &&
      ((intersects[0] && selected.object.id !== intersects[0]?.object.id) || !intersects.length)
    ) {
      selected.object.material.opacity = selected.object.userData.markedMine ? 0.7 : 0.4;
      selected.object.scale.set(1, 1, 1);
      this.selectedCubes[controller.userData.index] = null;
    }

    if (intersects.length > 0 && intersects[0].distance < controller.userData.selectorLength) {
      const object = intersects[0].object as Mesh<Geometry, Material>;
      object.material.opacity = 1;
      object.scale.set(1.2, 1.2, 1.2);
      controller.children[0].scale.z = intersects[0].distance;

      if (this.selectedCubes[controller.userData.index]?.object.id !== intersects[0].object.id) {
        playSound(Sounds.HOVER);
      }
      this.selectedCubes[controller.userData.index] = intersects[0];
    } else {
      controller.children[0].scale.z = controller.userData.selectorLength;
    }

    if (
      controller.userData.selectPressed &&
      selected &&
      this.isHoveredOnSelectStart &&
      Date.now() - this.selectPressedTime > 500 &&
      !this.view.isInteractionDisabled
    ) {
      toggleFlag(selected.object);
      this.selectPressedTime = Date.now() + 6.048e8;
    }

    if (controller.userData.squeezePressed) {
      this.handleSqueeze(controller);
    }
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
          this.game.gameover();
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
      let playgroundInitialRotation = new Euler().setFromRotationMatrix(
        this.playgroundInitialMatrix
      );

      this.view.playground.rotation.set(
        playgroundInitialRotation.x - (controllerRotation.x - controller.rotation.x),
        playgroundInitialRotation.y - (controllerRotation.y - controller.rotation.y),
        playgroundInitialRotation.z - (controllerRotation.z - controller.rotation.z)
      );
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
