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

export function createNumber(
  position: {x: number; y: number; z: number},
  text: string,
  cubeSize: number,
  gridCoordinates,
): Mesh {
  const boxGeometry = new BoxGeometry(cubeSize, cubeSize, cubeSize);
  const boxMaterial = new MeshBasicMaterial({
    color: colors.cube,
  });

  boxMaterial.transparent = true;
  boxMaterial.opacity = 0;
  const numberBox = new Mesh(boxGeometry, boxMaterial);

  const geometry = new TextGeometry(text, {
    font,
    size: cubeSize / 2.5,
    height: 0.001,
  });
  geometry.center();

  const material = new MeshBasicMaterial({color: colors[text]});
  material.transparent = true;
  material.opacity = 0.7;
  const textObject = new Mesh(geometry, material);

  numberBox.position.set(position.x, position.y, position.z);
  numberBox.add(textObject);

  numberBox.name = 'number-box';
  numberBox.renderOrder = 1;
  numberBox.userData.coordinates = {...gridCoordinates};
  numberBox.userData.number = text;

  return numberBox;
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


  let cubeMargin = cubeSize * 1.2;
  let halfGrid = (cubeMargin * gridSize) / 2 - cubeMargin / 2;
  cube.position.set(
    position.x * cubeMargin - halfGrid,
    position.y * cubeMargin - halfGrid,
    position.z * cubeMargin - halfGrid
  );

  cube.add(createEdges(geometry));
  return cube;
}

export function createMine(position: {x: number; y: number; z: number}, cubeSize: number): Mesh {
  const geometry = new IcosahedronGeometry(cubeSize / 2);
  const material = new MeshBasicMaterial({color: colors.mine});
  const mine = new Mesh(geometry, material);
  material.transparent = true;
  material.opacity = 0.7;


  mine.position.set(position.x, position.y, position.z);

  mine.add(createEdges(geometry));
  mine.name = 'mine';
  return mine;
}

function createEdges(geometry): LineSegments {
  const edges = new EdgesGeometry(geometry);
  const line = new LineSegments(edges, new LineBasicMaterial({color: colors.edges}));
  line.material.transparent = true;
  line.material.opacity = 0.7;
  return line;
}

export function toggleFlag(cube: Mesh<Geometry, any>) {
  cube.userData.markedMine = !cube.userData.markedMine;
  cube.material.map = cube.userData.markedMine ? flagTexture : null;
  cube.material.needsUpdate = true;
  playSound(cube.userData.markedMine ? Sounds.MARK : Sounds.UNMARK);
}
