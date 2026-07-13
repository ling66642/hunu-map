import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const SVG_WIDTH = 1600;
const SVG_HEIGHT = 1100;
const MODEL_PIXEL_RATIO = 2;
const MODEL_HEIGHT_X = -0.28;
const MODEL_HEIGHT_Y = -1.15;

let campusModelPromise;
const routeModelImageCache = new Map();

function loadCampusModel() {
  if (campusModelPromise) return campusModelPromise;

  campusModelPromise = new Promise((resolve, reject) => {
    const manager = new THREE.LoadingManager();
    let loadedObject = null;
    let settled = false;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('真实三维模型加载失败'));
    };

    manager.onLoad = () => {
      if (!loadedObject || settled) return;
      settled = true;
      loadedObject.updateMatrixWorld(true);
      resolve(loadedObject);
    };
    manager.onError = (url) => fail(new Error(`模型资源加载失败：${url}`));

    const mtlLoader = new MTLLoader(manager);
    mtlLoader.setResourcePath('/models/');
    mtlLoader.load('/models/textured_model.mtl', (materials) => {
      materials.preload();
      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.load('/models/textured_model.obj', (object) => {
        loadedObject = object;
      }, undefined, fail);
    }, undefined, fail);
  });

  return campusModelPromise;
}

function solveThreeByThree(matrix, vector) {
  const rows = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-10) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index < 4; index += 1) rows[column][index] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let index = column; index < 4; index += 1) rows[row][index] -= factor * rows[column][index];
    }
  }
  return rows.map((row) => row[3]);
}

function fitAxis(samples, targetKey) {
  const matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const vector = [0, 0, 0];
  samples.forEach((sample) => {
    const basis = [sample.modelX, sample.modelY, 1];
    for (let row = 0; row < 3; row += 1) {
      vector[row] += basis[row] * sample[targetKey];
      for (let column = 0; column < 3; column += 1) matrix[row][column] += basis[row] * basis[column];
    }
  });
  return solveThreeByThree(matrix, vector);
}

function collectModelGroups(model) {
  const groups = new Map();
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (!child.isMesh) return;
    const modelId = child.name.match(/^Building_(\d+)_/i)?.[1];
    if (!modelId) return;
    child.geometry.computeBoundingBox();
    const meshBox = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);
    if (!groups.has(modelId)) groups.set(modelId, { box: new THREE.Box3(), meshes: [] });
    const group = groups.get(modelId);
    group.box.union(meshBox);
    group.meshes.push(child);
  });
  return groups;
}

function createModelTransform(modelGroups, anchors) {
  const anchorMap = new Map(anchors.map((anchor) => [anchor.id, anchor.point]));
  const center = new THREE.Vector3();
  const samples = [];
  modelGroups.forEach((group, id) => {
    const point = anchorMap.get(id);
    if (!point) return;
    group.box.getCenter(center);
    samples.push({ modelX: center.x, modelY: center.y, screenX: point[0], screenY: point[1] });
  });
  if (samples.length < 3) throw new Error('模型与建筑数据的配准点不足');
  const xAxis = fitAxis(samples, 'screenX');
  const yAxis = fitAxis(samples, 'screenY');
  if (!xAxis || !yAxis) throw new Error('模型坐标配准失败');
  const [a, b, c] = xAxis;
  const [d, e, f] = yAxis;
  const depthFactor = 0.025;
  return new THREE.Matrix4().set(
    a, b, MODEL_HEIGHT_X, c,
    d, e, MODEL_HEIGHT_Y, f,
    d * depthFactor, e * depthFactor, 0.8, 180 + f * depthFactor,
    0, 0, 0, 1,
  );
}

function sourceMaterial(mesh) {
  return Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
}

async function renderRouteModels({ anchors, color, modelBuildingIds }) {
  const model = await loadCampusModel();
  const modelGroups = collectModelGroups(model);
  const transform = createModelTransform(modelGroups, anchors);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(MODEL_PIXEL_RATIO);
  renderer.setSize(SVG_WIDTH, SVG_HEIGHT, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfffbef, 0x425852, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-500, -900, 1200);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xf7d7bb, 1.1);
  fillLight.position.set(900, 450, 700);
  scene.add(fillLight);

  const routeColor = new THREE.Color(color);
  const roofColor = routeColor.clone().lerp(new THREE.Color(0xffffff), 0.68);
  const edgeMaterial = new THREE.LineBasicMaterial({ color: routeColor.clone().multiplyScalar(0.48), transparent: true, opacity: 0.82 });
  const disposableGeometries = [];
  const disposableMaterials = [edgeMaterial];
  let renderedMeshCount = 0;

  modelBuildingIds.forEach((modelId) => {
    const group = modelGroups.get(modelId);
    group?.meshes.forEach((sourceMesh) => {
      const geometry = sourceMesh.geometry.clone();
      geometry.applyMatrix4(sourceMesh.matrixWorld);
      geometry.applyMatrix4(transform);
      geometry.computeVertexNormals();
      const isRoof = /Roof/i.test(sourceMesh.name);
      const originalMaterial = sourceMaterial(sourceMesh);
      const material = new THREE.MeshStandardMaterial({
        color: isRoof ? roofColor : routeColor,
        map: isRoof ? originalMaterial?.map || null : null,
        roughness: isRoof ? 0.72 : 0.58,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const edgesGeometry = new THREE.EdgesGeometry(geometry, 22);
      scene.add(new THREE.LineSegments(edgesGeometry, edgeMaterial));
      disposableGeometries.push(geometry, edgesGeometry);
      disposableMaterials.push(material);
      renderedMeshCount += 1;
    });
  });

  if (!renderedMeshCount) {
    renderer.dispose();
    throw new Error('当前路线没有匹配到可渲染的三维建筑模型');
  }

  const camera = new THREE.OrthographicCamera(0, SVG_WIDTH, 0, SVG_HEIGHT, 1, 2000);
  camera.position.set(0, 0, 1000);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const checkTarget = new THREE.WebGLRenderTarget(160, 110);
  const checkPixels = new Uint8Array(160 * 110 * 4);
  renderer.setRenderTarget(checkTarget);
  renderer.render(scene, camera);
  renderer.readRenderTargetPixels(checkTarget, 0, 0, 160, 110, checkPixels);
  const visiblePixelCount = checkPixels.reduce((count, value, index) => (index % 4 === 3 && value > 8 ? count + 1 : count), 0);
  checkTarget.dispose();
  if (visiblePixelCount < 8) {
    renderer.dispose();
    throw new Error('三维模型渲染结果为空');
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');

  disposableGeometries.forEach((geometry) => geometry.dispose());
  disposableMaterials.forEach((material) => material.dispose());
  renderer.dispose();
  renderer.forceContextLoss();
  return dataUrl;
}

function getRouteModelImage(modelKey, options) {
  if (!routeModelImageCache.has(modelKey)) {
    const renderPromise = renderRouteModels(options).catch((error) => {
      routeModelImageCache.delete(modelKey);
      throw error;
    });
    routeModelImageCache.set(modelKey, renderPromise);
  }
  return routeModelImageCache.get(modelKey);
}

export default function RouteModelLayer({ active, anchors, color, modelBuildingIds, onReadyChange, routeId }) {
  const [result, setResult] = useState(null);
  const modelKey = useMemo(
    () => `${routeId}:${color}:${[...modelBuildingIds].sort((a, b) => Number(a) - Number(b)).join(',')}`,
    [color, modelBuildingIds, routeId],
  );
  const currentResult = result?.key === modelKey ? result : null;

  useEffect(() => {
    let cancelled = false;
    if (!active) {
      onReadyChange?.(true);
      return () => { cancelled = true; };
    }

    onReadyChange?.(false);
    getRouteModelImage(modelKey, { anchors, color, modelBuildingIds })
      .then((dataUrl) => {
        if (cancelled) return;
        setResult({ key: modelKey, dataUrl, error: '' });
        onReadyChange?.(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ key: modelKey, dataUrl: '', error: error.message || '真实三维模型渲染失败' });
        onReadyChange?.(false);
      });

    return () => { cancelled = true; };
  }, [active, anchors, color, modelBuildingIds, modelKey, onReadyChange]);

  if (!active) return null;
  if (currentResult?.dataUrl) {
    return <image className="route-model-layer" href={currentResult.dataUrl} x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} preserveAspectRatio="none" />;
  }
  return (
    <g className="model-loading-state" transform="translate(800 942)">
      <rect x="-118" y="-18" width="236" height="32" rx="6" fill="#f8f4e9" stroke="#d7cfbe" />
      <text y="3" textAnchor="middle" fontSize="11" fill={currentResult?.error ? '#a33f38' : '#64736d'}>
        {currentResult?.error || '正在载入真实三维建筑模型…'}
      </text>
    </g>
  );
}
