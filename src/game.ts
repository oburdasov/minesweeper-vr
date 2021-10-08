import {Object3D} from 'three';
import {Cube} from './cube.model';
import {createCube} from './objects';
import {playSound, Sounds} from './sounds';
import {View} from './view';

export const difficulties = [
  {gridSize: 4, mines: 6},
  {gridSize: 5, mines: 16},
  {gridSize: 6, mines: 32},
];

export class Game {
  private firstMove: boolean;
  private cubeMatrix: Cube[][][];
  private gridSize = difficulties[0].gridSize;
  private difficultyIndex = 0;
  totalMines = difficulties[0].mines;

  constructor(private view: View) {
    this.firstMove = true;
    this.cubeMatrix = [
      [new Array(5), new Array(5), new Array(5), new Array(5), new Array(5)],
      [new Array(5), new Array(5), new Array(5), new Array(5), new Array(5)],
      [new Array(5), new Array(5), new Array(5), new Array(5), new Array(5)],
      [new Array(5), new Array(5), new Array(5), new Array(5), new Array(5)],
      [new Array(5), new Array(5), new Array(5), new Array(5), new Array(5)],
    ];
  }

  changeDifficulty() {
    this.difficultyIndex = this.difficultyIndex < 2 ? this.difficultyIndex + 1 : 0;

    this.gridSize = this.view.gridSize = difficulties[this.difficultyIndex].gridSize;
    this.totalMines = difficulties[this.difficultyIndex].mines;

    this.restart();
  }

  markFirstMove(firstCube: Object3D) {
    playSound(Sounds.SELECT);
    this.firstMove = false;
    this.fillWithMines(firstCube);
  }

  isFirstMove(): boolean {
    return this.firstMove;
  }

  restart() {
    this.firstMove = true;
    this.setupGrid();
  }

  gameover(mine: Object3D) {
    playSound(Sounds.GAME_OVER);
    this.view.showMines();
    this.view.runEndAnimation(mine);
    setTimeout(() => this.restart(), 1500);
  }

  victory() {
    playSound(Sounds.VICTORY);
    setTimeout(() => this.restart(), 1500);
  }

  setupGrid() {
    this.cubeMatrix = [];
    let cubeObjects = [];

    for (let x = 0; x < this.gridSize; x++) {
      this.cubeMatrix.push([]);
      for (let y = 0; y < this.gridSize; y++) {
        this.cubeMatrix[x].push([]);
        for (let z = 0; z < this.gridSize; z++) {
          const cube = createCube({x, y, z}, this.view.cubeSize, this.gridSize);
          this.cubeMatrix[x][y].push({coordinates: {x, y, z}, object: cube});
          cubeObjects.push(cube);
        }
      }
    }

    this.view.reset(cubeObjects);
  }

  private fillWithMines(firstCube: Object3D) {
    let counter = 0;
    while (counter < this.totalMines) {
      let randomX = Math.floor(Math.random() * this.gridSize);
      let randomY = Math.floor(Math.random() * this.gridSize);
      let randomZ = Math.floor(Math.random() * this.gridSize);

      let randomCube = this.cubeMatrix[randomX][randomY][randomZ];
      if (!randomCube.isMine && randomCube.object.id !== firstCube.id) {
        this.cubeMatrix[randomX][randomY][randomZ].isMine = true;
        counter++;
      }
    }

    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        for (let z = 0; z < this.gridSize; z++) {
          let cube = this.cubeMatrix[x][y][z];
          let minesCount = 0;

          if (!cube.isMine) {
            for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                for (let k = -1; k <= 1; k++) {
                  if (
                    this.cubeMatrix[x + i] &&
                    this.cubeMatrix[x + i][y + j] &&
                    this.cubeMatrix[x + i][y + j][z + k]?.isMine
                  ) {
                    minesCount++;
                  }
                }
              }
            }
          }
          cube.object.userData.minesCount = cube.minesCount = minesCount;
          cube.object.userData.isMine = cube.isMine;
          cube.object.userData.coordinates = cube.coordinates;
        }
      }
    }
  }

  openEmptyCubes(object: Object3D) {
    let cubesToDelete = [];
    let cubesToSwap = [];

    let runThroughNeighbours = (obj: Object3D) => {
      let {x, y, z} = obj.userData?.coordinates;
      cubesToDelete.push(obj);
      obj.userData.checked = true;
  
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          for (let k = -1; k <= 1; k++) {
            if (
              this.cubeMatrix[x + i] &&
              this.cubeMatrix[x + i][y + j] &&
              this.cubeMatrix[x + i][y + j][z + k]
            ) {
              let cube = this.cubeMatrix[x + i][y + j][z + k];
  
              if (!cube.object.userData.checked) {
                if (cube.minesCount) {
                  cubesToSwap.push(cube.object);
                } else {
                  runThroughNeighbours(cube.object);
                }
                cube.object.userData.checked = true;
              }
            }
          }
        }
      }
    }
    runThroughNeighbours(object);

    this.view.runChainAnimation(cubesToDelete, cubesToSwap);
  }
}
