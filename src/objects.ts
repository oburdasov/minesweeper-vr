import {
  BoxGeometry,
  EdgesGeometry,
  Font,
  FontLoader,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  TextGeometry,
  IcosahedronGeometry,
  TextureLoader,
  Geometry,
} from 'three';
import {colors} from './colors';
import {playSound, Sounds} from './sounds';

let loader = new FontLoader();
let font: Font;

let textureLoader = new TextureLoader();
let flagTexture = textureLoader.load(require('./assets/flag.jpg').default);

loader.load(
  'https://cdn.rawgit.com/marpi/worlds/master/assets/fonts/helvetiker_regular.typeface.json',
  (loadedFont) => (font = loadedFont)
);

export function createText(
  position: {x: number; y: number; z: number},
  text: string,
  cubeSize: number
): Mesh {
  const geometry = new TextGeometry(text, {
    font,
    size: cubeSize / 2.5,
    height: 0,
  });
  geometry.center();

  const material = new MeshBasicMaterial({color: colors[text]});
  material.transparent = true;
  material.opacity = 0.7;
  const textObject = new Mesh(geometry, material);

  textObject.position.set(position.x, position.y, position.z);
  textObject.name = 'number';

  return textObject;
}

export function createCube(
  position: {x: number; y: number; z: number},
  cubeSize: number,
  gridSize: number
): Mesh {
  const geometry = new BoxGeometry(cubeSize, cubeSize, cubeSize);
  const material = new MeshBasicMaterial({
    color: colors.cube,
  });
  material.transparent = true;
  material.opacity = 0.4;
  const cube = new Mesh(geometry, material);

  const edges = new EdgesGeometry(geometry);
  const line = new LineSegments(edges, new LineBasicMaterial({color: colors.edges}));
  cube.add(line);

  let cubeMargin = cubeSize * 1.2;
  let halfGrid = (cubeMargin * gridSize) / 2 - cubeMargin / 2;
  cube.position.set(
    position.x * cubeMargin - halfGrid,
    position.y * cubeMargin - halfGrid,
    position.z * cubeMargin - halfGrid
  );
  return cube;
}

export function createMine(position: {x: number; y: number; z: number}, cubeSize: number): Mesh {
  const geometry = new IcosahedronGeometry(cubeSize / 2);
  const material = new MeshBasicMaterial({color: colors.mine});
  const mine = new Mesh(geometry, material);

  mine.position.set(position.x, position.y, position.z);

  const edges = new EdgesGeometry(geometry);
  const line = new LineSegments(edges, new LineBasicMaterial({color: colors.edges}));
  mine.add(line);
  return mine;
}

export function toggleFlag(cube: Mesh<Geometry, any>) {
  cube.userData.markedMine = !cube.userData.markedMine;
  cube.material.map = cube.userData.markedMine ? flagTexture : null;
  cube.material.needsUpdate = true;
  playSound(cube.userData.markedMine ? Sounds.MARK : Sounds.UNMARK);
}
