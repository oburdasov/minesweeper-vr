import { Mesh } from "three";

export interface Cube {
  object?: Mesh;
  isMine?: boolean;
  minesCount?: number;
  markedMine?: boolean;
  coordinates: {x: number, y: number, z: number};
  checked?: boolean;
}
