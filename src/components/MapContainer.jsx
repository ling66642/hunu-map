import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';


function featureCenterAMap(feature) {
  const points = [];
  const walk = value => {
    if (typeof value?.[0] === 'number') points.push(value);
    else value?.forEach(walk);
  };
  walk(feature.geometry.coordinates);
  if (!points.length) return [112.9444, 28.1908];
  return [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length
  ];
}

// Constants for GCJ-02 transformation (Lushan Road alignment)
const PI = Math.PI;
const AXIS = 6378245.0;
const OFFSET = 0.006693421622965943;

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320.0 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLon(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function wgs84ToGcj02(lng, lat) {
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
    return [lng, lat];
  }
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLon = transformLon(lng - 105.0, lat - 35.0);
  let radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - OFFSET * magic * magic;
  let sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((AXIS * (1 - OFFSET)) / (magic * sqrtMagic) * PI);
  dLon = (dLon * 180.0) / (AXIS / sqrtMagic * Math.cos(radLat) * PI);
  return [lng + dLon, lat + dLat];
}



const categoryColors = { 
  teaching: '#d9c6a4', 
  library: '#b78b67', 
  sports: '#d97b5d', 
  dining: '#d5a54e', 
  residence: '#aab6c3', 
  service: '#c8c5b8' 
};

let amapLoadPromise = null;

function loadAMapScript(key) {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoadPromise) return amapLoadPromise;

  amapLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src*="webapi.amap.com/maps"]');
    if (existingScript) {
      existingScript.onload = () => resolve(window.AMap);
      existingScript.onerror = (e) => reject(e);
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.GeoJSON,AMap.Polygon,AMap.Polyline,AMap.ControlBar`;
    script.onload = () => {
      resolve(window.AMap);
    };
    script.onerror = (e) => {
      reject(e);
    };
    document.head.appendChild(script);
  });

  return amapLoadPromise;
}

function geoJsonToAMapOverlays(geojson, styleFunc, eventHandlers = {}) {
  const overlays = [];
  const AMap = window.AMap;
  if (!AMap || !geojson || !geojson.features) return overlays;
  
  geojson.features.forEach((feature, index) => {
    const geom = feature.geometry;
    if (!geom) return;
    
    const style = typeof styleFunc === 'function' ? styleFunc(feature, index) : styleFunc;
    
    if (geom.type === 'Polygon') {
      const polygon = new AMap.Polygon({
        path: geom.coordinates,
        extData: feature,
        ...style
      });
      bindEvents(polygon, eventHandlers, feature);
      overlays.push(polygon);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(polyCoords => {
        const polygon = new AMap.Polygon({
          path: polyCoords,
          extData: feature,
          ...style
        });
        bindEvents(polygon, eventHandlers, feature);
        overlays.push(polygon);
      });
    } else if (geom.type === 'LineString') {
      const polyline = new AMap.Polyline({
        path: geom.coordinates,
        extData: feature,
        ...style
      });
      bindEvents(polyline, eventHandlers, feature);
      overlays.push(polyline);
    } else if (geom.type === 'MultiLineString') {
      geom.coordinates.forEach(lineCoords => {
        const polyline = new AMap.Polyline({
          path: lineCoords,
          extData: feature,
          ...style
        });
        bindEvents(polyline, eventHandlers, feature);
        overlays.push(polyline);
      });
    }
  });
  return overlays;
}

function bindEvents(overlay, handlers, feature) {
  Object.keys(handlers).forEach(eventName => {
    overlay.on(eventName, (e) => {
      handlers[eventName](feature, overlay, e);
    });
  });
}

function setModelBuildingVisibility(modelRoot, allowedBuildingIds) {
  if (!modelRoot) return;

  modelRoot.traverse((child) => {
    if (!child.isMesh) return;

    const modelBuildingId = child.name.match(/^building_(\d+)_/)?.[1];
    child.visible = allowedBuildingIds === null || (
      modelBuildingId && allowedBuildingIds.has(modelBuildingId)
    );
  });
}

// Check if a building feature is a route stop (name contains the stop keyword)
function isRouteStopBuilding(feature, activeRoute) {
  if (!activeRoute || !activeRoute.stops) return false;
  const name = feature.properties?.displayName || '';
  if (!name || name === '校园建筑') return false;
  return activeRoute.stops.some(stop => name.includes(stop));
}

// Apply route colors to 3D model meshes based on building feature indices
// buildingIndexToColor: Map<string, number> | null  (null = all white)
function applyModelColors(modelRoot, buildingIndexToColor) {
  if (!modelRoot) return;
  modelRoot.traverse((child) => {
    if (!child.isMesh) return;
    const modelFeatureNo = child.name.match(/^building_(\d+)_/)?.[1];
    if (buildingIndexToColor && modelFeatureNo && buildingIndexToColor.has(modelFeatureNo)) {
      child.material.color.setHex(buildingIndexToColor.get(modelFeatureNo));
    } else {
      child.material.color.setHex(0xffffff);
    }
  });
}

export default function MapContainer({ datasets, buildings, selectedBuilding, setSelectedBuilding, activeRoute, focusName, onRouteStopSelect }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  
  const [amapLoaded, setAmapLoaded] = useState(!!window.AMap);
  const [is3D, setIs3D] = useState(true);
  const is3DRef = useRef(is3D);
  const [mapStyle, setMapStyle] = useState('color'); // 'color' or 'white'
  const mapStyleRef = useRef(mapStyle);

  const boundaryOverlayRef = useRef([]);
  const waterOverlayRef = useRef([]);
  const roadsOverlayRef = useRef([]);
  const buildingOverlaysRef = useRef([]);
  const labelMarkersRef = useRef([]);
  const routeOverlaysRef = useRef([]);
  const infoWindowRef = useRef(null);
  const glCustomLayerRef = useRef(null);
  const modelRootRef = useRef(null);
  const visibleModelBuildingIdsRef = useRef(null);
  const modelColorMapRef = useRef(null);
  const activeRouteRef = useRef(activeRoute);

  // Sync is3D ref
  useEffect(() => {
    is3DRef.current = is3D;
  }, [is3D]);

  // Sync activeRoute ref
  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);

  // Sync mapStyle ref
  useEffect(() => {
    mapStyleRef.current = mapStyle;
  }, [mapStyle]);

  // When a route is active, force 3D mode
  useEffect(() => {
    if (activeRoute) {
      setIs3D(true);
    }
  }, [activeRoute]);

  // 1. Load AMap Script
  useEffect(() => {
    loadAMapScript('07affa979c5e94a38e8cff791df7df96')
      .then(() => {
        setAmapLoaded(true);
      })
      .catch(err => {
        console.error('加载高德地图失败:', err);
      });
  }, []);

  // 2. Initialize Map (run once when loaded and datasets available)
  useEffect(() => {
    if (!amapLoaded || !datasets || !rootRef.current || mapRef.current) return;

    const AMap = window.AMap;

    // Initialize Map Instance
    const map = new AMap.Map(rootRef.current, {
      zoom: 17,
      center: wgs84ToGcj02(112.9444, 28.1908),
      viewMode: '3D',
      pitch: is3DRef.current ? 55 : 0,
      rotation: is3DRef.current ? 15 : 0,
      features: ['bg'], // custom style: background only
      zoomEnable: true,
      dragEnable: true,
      pitchEnable: true,
      rotateEnable: true,
      buildingAnimation: true
    });

    mapRef.current = map;

    // Add ControlBar for camera rotation/tilt controls (Free Camera Movement)
    map.plugin(['AMap.ControlBar'], () => {
      const controlBar = new AMap.ControlBar({
        position: {
          left: '18px',
          top: '18px'
        },
        showZoomBar: false,
        showControlButton: true
      });
      map.addControl(controlBar);
    });

    // Set custom coordinates center directly to GCJ-02 center for perfect 3D model alignment
    const wgsCenter = [112.94439936956965, 28.19068143590572];
    const gcjCenter = wgs84ToGcj02(wgsCenter[0], wgsCenter[1]);
    map.customCoords.setCenter(gcjCenter);

    // Set Bounds using GCJ-02 coordinates
    const swGcj = wgs84ToGcj02(112.9391912, 28.1853094);
    const neGcj = wgs84ToGcj02(112.9496931, 28.196472);
    map.setBounds(new AMap.Bounds(swGcj, neGcj));

    // Shared InfoWindow for Tooltips
    infoWindowRef.current = new AMap.InfoWindow({
      isCustom: true,
      offset: new AMap.Pixel(0, -10),
      autoMove: false,
      content: ''
    });

    // Sync is3D state if map pitch is changed manually by user (e.g. Right click + drag)
    map.on('pitch', () => {
      if (activeRouteRef.current) return; // Don't toggle is3D when route is active
      const currentPitch = map.getPitch();
      setIs3D(currentPitch > 15);
    });

    // Render Boundary Layer
    const boundaryStyle = {
      strokeColor: '#204f48',
      strokeWeight: 2.2,
      strokeOpacity: 0.8,
      fillColor: '#edf0df',
      fillOpacity: 1,
      strokeStyle: 'dashed',
      strokeDasharray: [7, 5]
    };
    const boundaryOverlays = geoJsonToAMapOverlays(datasets.boundary, boundaryStyle);
    map.add(boundaryOverlays);
    boundaryOverlayRef.current = boundaryOverlays;

    // Render Water Layer
    const waterStyle = {
      strokeColor: '#92bdc1',
      strokeWeight: 1,
      fillColor: '#b9dadd',
      fillOpacity: 0.9
    };
    const waterOverlays = geoJsonToAMapOverlays(datasets.water, waterStyle);
    map.add(waterOverlays);
    waterOverlayRef.current = waterOverlays;

    // Render Roads Layer
    const roadStyle = (feature) => {
      const major = ['secondary', 'primary', 'tertiary'].includes(feature.properties?.highway);
      return {
        strokeColor: major ? '#d7cfc0' : '#eee8dc',
        strokeWeight: major ? 5 : 2.2,
        strokeOpacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      };
    };
    const roadOverlays = geoJsonToAMapOverlays(datasets.roads, roadStyle);
    map.add(roadOverlays);
    roadsOverlayRef.current = roadOverlays;

    // Initialize 3D white model layer using Three.js
    let renderer, scene, camera;
    const glLayer = new AMap.GLCustomLayer({
      zIndex: 110,
      init: (gl) => {
        renderer = new THREE.WebGLRenderer({
          context: gl,
          antialias: true
        });
        renderer.autoClear = false;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 100000);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(300, 800, 400);
        scene.add(dirLight);

        // Uniform Solid Flat White Material (unaffected by lighting/shadows)
        const whiteMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: false,
          opacity: 1.0
        });

        // Slate gray line material for building outlines
        const edgeMaterial = new THREE.LineBasicMaterial({
          color: 0x94a3b8,
          linewidth: 1
        });

        // Load OBJ/MTL from public/models/white_model
        const mtlLoader = new MTLLoader();
        mtlLoader.load('/models/white_model.mtl', (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load('/models/white_model.obj', (object) => {
            // Apply scale, rotation, and translation offsets for UTM vs Web Mercator alignment
            object.scale.set(1.1345, 1.1345, 1.1345);
            object.rotation.z = -0.918 * Math.PI / 180;
            object.position.set(-4.5, 2.0, 0);
            
            // Force every submesh to use its own cloned material (so we can color individually) and add crisp outlines
            object.traverse((child) => {
              if (child.isMesh) {
                child.material = whiteMaterial.clone();
                child.castShadow = false;
                child.receiveShadow = false;
                
                // Add sharp outlines to show structural edges clearly on the solid white mesh
                const edgesGeometry = new THREE.EdgesGeometry(child.geometry, 15);
                const lineSegments = new THREE.LineSegments(edgesGeometry, edgeMaterial);
                child.add(lineSegments);
              }
            });
            
            modelRootRef.current = object;
            setModelBuildingVisibility(object, visibleModelBuildingIdsRef.current);
            // Apply stored colors (in case route was selected before model loaded)
            applyModelColors(object, modelColorMapRef.current);
            scene.add(object);
            map.render();
          });
        });
      },
      render: () => {
        if (!renderer || !scene || !camera) return;

        const { near, far, fov, up, lookAt, position } = map.customCoords.getCameraParams();
        camera.near = near;
        camera.far = far;
        camera.fov = fov;
        camera.position.set(...position);
        camera.up.set(...up);
        camera.lookAt(...lookAt);
        camera.updateProjectionMatrix();

        renderer.resetState();
        renderer.render(scene, camera);
        map.render();
      }
    });

    map.add(glLayer);
    glCustomLayerRef.current = glLayer;

    // Show/hide based on current is3D value
    if (is3DRef.current) {
      glLayer.show();
    } else {
      glLayer.hide();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [amapLoaded, datasets]);

  // 推荐路线激活时，3D 模型仅保留途经点对应的建筑，并按路线色着色。
  // 使用建筑在数组中的位置索引（feature_no = index + 1）匹配 OBJ 模型 mesh。
  useEffect(() => {
    if (!activeRoute) {
      visibleModelBuildingIdsRef.current = null;
      modelColorMapRef.current = null;
      setModelBuildingVisibility(modelRootRef.current, null);
      applyModelColors(modelRootRef.current, null);
    } else {
      const allFeatures = datasets?.buildings.features || [];

      // Find route stop indices (1-based, matching OBJ feature_no)
      const routeStopFeatureNos = new Set();
      const routeColorHex = parseInt(activeRoute.color.replace('#', ''), 16);
      const buildingIndexToColor = new Map();

      allFeatures.forEach((feature, index) => {
        if (isRouteStopBuilding(feature, activeRoute)) {
          const featureNo = String(index + 1);
          routeStopFeatureNos.add(featureNo);
          buildingIndexToColor.set(featureNo, routeColorHex);
        }
      });

      visibleModelBuildingIdsRef.current = routeStopFeatureNos;
      modelColorMapRef.current = buildingIndexToColor;

      setModelBuildingVisibility(modelRootRef.current, routeStopFeatureNos);
      applyModelColors(modelRootRef.current, buildingIndexToColor);
    }
    mapRef.current?.render();
  }, [activeRoute, datasets]);

  // 3. Render Buildings and Labels (runs when buildings list or selection/style changes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !amapLoaded) return;

    const AMap = window.AMap;

    // Clear old buildings and labels
    if (buildingOverlaysRef.current.length > 0) {
      map.remove(buildingOverlaysRef.current);
      buildingOverlaysRef.current = [];
    }
    if (labelMarkersRef.current.length > 0) {
      map.remove(labelMarkersRef.current);
      labelMarkersRef.current = [];
    }

    const newLabelMarkers = [];

    const buildingStyle = (feature) => {
      const isSelected = selectedBuilding?.properties?.mapId === feature.properties?.mapId;
      const cat = feature.properties?.category;
      const baseColor = categoryColors[cat] || '#c8c5b8';
      const isField = feature.properties?.name?.includes('田径场');

      // Mixed mode: when a route is active, route stops are 3D, others are 2D
      if (activeRoute) {
        const isRouteStop = isRouteStopBuilding(feature, activeRoute);
        if (isRouteStop) {
          // Route stop buildings: 3D style (white model visible, transparent fill)
          if (isField) {
            return {
              strokeColor: isSelected ? '#1e6258' : '#fffdf6',
              strokeWeight: isSelected ? 2 : 1.2,
              fillColor: isSelected ? '#1e6258' : '#e28b75',
              fillOpacity: 0.8,
              height: 0
            };
          }
          return {
            strokeColor: isSelected ? '#1e6258' : 'transparent',
            strokeWeight: isSelected ? 2 : 1.2,
            fillColor: isSelected ? '#1e6258' : 'transparent',
            fillOpacity: isSelected ? 0.35 : 0.001,
            height: 15
          };
        } else {
          // Non-route buildings: 2D white flat style
          return {
            strokeColor: '#cbd5e1',
            strokeWeight: isSelected ? 2 : 1.2,
            fillColor: isSelected ? '#1e6258' : '#ffffff',
            fillOpacity: 0.98,
            height: 0
          };
        }
      }

      if (is3DRef.current) {
        if (isField) {
          return {
            strokeColor: isSelected ? '#1e6258' : (mapStyleRef.current === 'white' ? '#cbd5e1' : '#fffdf6'),
            strokeWeight: isSelected ? 2 : 1.2,
            fillColor: isSelected ? '#1e6258' : (mapStyleRef.current === 'white' ? '#f1f5f9' : '#e28b75'),
            fillOpacity: 0.8,
            height: 0
          };
        }
        return {
          strokeColor: isSelected ? '#1e6258' : 'transparent',
          strokeWeight: isSelected ? 2 : 1.2,
          fillColor: isSelected ? '#1e6258' : 'transparent',
          fillOpacity: isSelected ? 0.35 : 0.001,
          height: 15
        };
      } else {
        if (mapStyleRef.current === 'white') {
          return {
            strokeColor: '#cbd5e1',
            strokeWeight: isSelected ? 2 : 1.2,
            fillColor: isSelected ? '#1e6258' : '#ffffff',
            fillOpacity: 0.98,
            height: 0
          };
        } else {
          return {
            strokeColor: '#fffdf6',
            strokeWeight: isSelected ? 2 : 1.2,
            fillColor: isSelected ? '#1e6258' : baseColor,
            fillOpacity: 0.96,
            height: 0
          };
        }
      }
    };

    const buildingHandlers = {
      mouseover: (feature, overlay, e) => {
        const cat = feature.properties?.category;
        const isField = feature.properties?.name?.includes('田径场');
        
        // In route mode: non-route buildings use dark green hover (white mapStyle look)
        let hoverColor;
        let hoverOpacity;
        if (activeRoute) {
          const isRouteStop = isRouteStopBuilding(feature, activeRoute);
          if (isRouteStop) {
            hoverColor = activeRoute.color;
            hoverOpacity = isField ? 0.9 : 0.4;
          } else {
            hoverColor = '#1e6258';
            hoverOpacity = 0.95;
          }
        } else {
          hoverColor = mapStyleRef.current === 'white' ? '#1e6258' : (categoryColors[cat] || '#1e6258');
          hoverOpacity = is3DRef.current ? (isField ? 0.9 : 0.4) : 0.95;
        }
        
        overlay.setOptions({
          fillColor: hoverColor,
          fillOpacity: hoverOpacity,
          strokeColor: hoverColor,
          strokeWeight: 2
        });
        
        const name = feature.properties?.displayName;
        infoWindowRef.current.setContent(`<div class="campus-tooltip">${name}</div>`);
        infoWindowRef.current.open(map, e.lnglat);
      },
      mousemove: (feature, overlay, e) => {
        infoWindowRef.current.setPosition(e.lnglat);
      },
      mouseout: (feature, overlay) => {
        const isSelected = selectedBuilding?.properties?.mapId === feature.properties?.mapId;
        const isField = feature.properties?.name?.includes('田径场');
        
        // In route mode: route stops use 3D restore, non-route use 2D restore
        if (activeRoute) {
          const isRouteStop = isRouteStopBuilding(feature, activeRoute);
          if (isRouteStop) {
            if (isField) {
              overlay.setOptions({
                fillColor: isSelected ? '#1e6258' : '#e28b75',
                fillOpacity: 0.8,
                strokeColor: isSelected ? '#1e6258' : '#fffdf6',
                strokeWeight: isSelected ? 2 : 1.2
              });
            } else {
              overlay.setOptions({
                fillColor: isSelected ? '#1e6258' : 'transparent',
                fillOpacity: isSelected ? 0.35 : 0.001,
                strokeColor: isSelected ? '#1e6258' : 'transparent',
                strokeWeight: isSelected ? 2 : 1.2
              });
            }
          } else {
            overlay.setOptions({
              fillColor: isSelected ? '#1e6258' : '#ffffff',
              strokeColor: '#cbd5e1',
              strokeWeight: isSelected ? 2 : 1.2,
              fillOpacity: 0.98
            });
          }
        } else if (is3DRef.current) {
          if (isField) {
            overlay.setOptions({
              fillColor: isSelected ? '#1e6258' : (mapStyleRef.current === 'white' ? '#f1f5f9' : '#e28b75'),
              fillOpacity: 0.8,
              strokeColor: isSelected ? '#1e6258' : (mapStyleRef.current === 'white' ? '#cbd5e1' : '#fffdf6'),
              strokeWeight: isSelected ? 2 : 1.2
            });
          } else {
            overlay.setOptions({
              fillColor: isSelected ? '#1e6258' : 'transparent',
              fillOpacity: isSelected ? 0.35 : 0.001,
              strokeColor: isSelected ? '#1e6258' : 'transparent',
              strokeWeight: isSelected ? 2 : 1.2
            });
          }
        } else {
          let normalColor;
          let strokeColor;
          if (mapStyleRef.current === 'white') {
            normalColor = isSelected ? '#1e6258' : '#ffffff';
            strokeColor = '#cbd5e1';
          } else {
            normalColor = isSelected ? '#1e6258' : (categoryColors[feature.properties?.category] || '#c8c5b8');
            strokeColor = '#fffdf6';
          }
          overlay.setOptions({
            fillColor: normalColor,
            strokeColor: strokeColor,
            strokeWeight: isSelected ? 2 : 1.2,
            fillOpacity: 0.96
          });
        }
        infoWindowRef.current.close();
      },
      click: (feature) => {
        setSelectedBuilding(feature);
        const center = featureCenterAMap(feature);
        map.setZoomAndCenter(Math.max(map.getZoom(), 18), center);
      }
    };

    const overlays = geoJsonToAMapOverlays(
      { type: 'FeatureCollection', features: buildings },
      buildingStyle,
      buildingHandlers
    );
    map.add(overlays);
    buildingOverlaysRef.current = overlays;

    // Add Text Labels for Buildings
    buildings.forEach(feature => {
      const name = feature.properties?.displayName;
      if (name && name !== '校园建筑') {
        const center = featureCenterAMap(feature);
        const labelMarker = new AMap.Marker({
          position: center,
          content: `<div class="building-label"><span>${name}</span></div>`,
          offset: new AMap.Pixel(-60, -10),
          bubble: true, // Let clicks bubble down to building polygons
          zIndex: 100
        });
        map.add(labelMarker);
        newLabelMarkers.push(labelMarker);
      }
    });
    labelMarkersRef.current = newLabelMarkers;

  }, [buildings, selectedBuilding, amapLoaded, setSelectedBuilding, mapStyle, activeRoute]);

  // Helper function: find nearest point on line segment to a point
  function findNearestPointOnSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return [ax, ay];
    
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    
    return [ax + t * dx, ay + t * dy];
  }

  // Helper function: find nearest point on a polyline to a point
  function findNearestPointOnPolyline(px, py, polyline) {
    let minDist = Infinity;
    let nearestPoint = null;
    
    for (let i = 0; i < polyline.length - 1; i++) {
      const [ax, ay] = polyline[i];
      const [bx, by] = polyline[i + 1];
      const point = findNearestPointOnSegment(px, py, ax, ay, bx, by);
      const dist = Math.sqrt((px - point[0]) ** 2 + (py - point[1]) ** 2);
      
      if (dist < minDist) {
        minDist = dist;
        nearestPoint = point;
      }
    }
    
    return nearestPoint;
  }

  // Helper function: find building center by name
  function findBuildingCenter(name, buildingsData) {
    if (!buildingsData || !buildingsData.features) return null;
    
    for (const feature of buildingsData.features) {
      const displayName = feature.properties?.displayName || feature.properties?.name || '';
      if (displayName.includes(name) || name.includes(displayName)) {
        return featureCenterAMap(feature);
      }
    }
    return null;
  }

  // 4. Render Active Route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !amapLoaded) return;

    const AMap = window.AMap;

    // Clear old route overlays
    if (routeOverlaysRef.current.length > 0) {
      map.remove(routeOverlaysRef.current);
      routeOverlaysRef.current = [];
    }

    if (!activeRoute) return;

    const newRouteOverlays = [];
    const path = activeRoute.coordinates.map(c => [c[1], c[0]]);
    const routeColor = activeRoute.color;

    // Helper to darken a hex color
    const darkenColor = (hex, amount) => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.max(0, (num >> 16) - amount);
      const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
      const b = Math.max(0, (num & 0x0000FF) - amount);
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    };

    // Outer glow line (wider, semi-transparent)
    const routeOuterGlow = new AMap.Polyline({
      path: path,
      strokeColor: routeColor,
      strokeWeight: 14,
      strokeOpacity: 0.15,
      lineCap: 'round',
      lineJoin: 'round'
    });
    map.add(routeOuterGlow);
    newRouteOverlays.push(routeOuterGlow);

    // Shadow line
    const routeShadow = new AMap.Polyline({
      path: path,
      strokeColor: darkenColor(routeColor, 60),
      strokeWeight: 7,
      strokeOpacity: 0.3,
      lineCap: 'round',
      lineJoin: 'round'
    });
    map.add(routeShadow);
    newRouteOverlays.push(routeShadow);

    // Main route line (solid with rounded caps)
    const routeMain = new AMap.Polyline({
      path: path,
      strokeColor: routeColor,
      strokeWeight: 5,
      strokeOpacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });
    map.add(routeMain);
    newRouteOverlays.push(routeMain);

    // Center highlight line (thinner, lighter)
    const routeHighlight = new AMap.Polyline({
      path: path,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      strokeOpacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round'
    });
    map.add(routeHighlight);
    newRouteOverlays.push(routeHighlight);

    // Direction arrows along the route
    const arrowInterval = Math.max(2, Math.floor(path.length / 8));
    for (let i = 0; i < path.length - 1; i += arrowInterval) {
      const start = path[i];
      const end = path[Math.min(i + 1, path.length - 1)];
      const midLng = (start[0] + end[0]) / 2;
      const midLat = (start[1] + end[1]) / 2;
      
      const arrowMarker = new AMap.Marker({
        position: [midLng, midLat],
        content: `<div style="
          width: 0; height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 8px solid ${routeColor};
          transform: rotate(${Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI - 90}deg);
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        "></div>`,
        offset: new AMap.Pixel(-5, -4),
        zIndex: 160
      });
      map.add(arrowMarker);
      newRouteOverlays.push(arrowMarker);
    }

    // Route Stop Markers - create markers at building perpendicular points
    const totalStops = activeRoute.stops.length;
    
    activeRoute.stops.forEach((stopName, i) => {
      const isFirst = i === 0;
      const isLast = i === totalStops - 1;
      
      // For first and last stops, use first and last coordinates directly
      let pos;
      if (isFirst) {
        const coord = activeRoute.coordinates[0];
        pos = [coord[1], coord[0]];
      } else if (isLast) {
        const coord = activeRoute.coordinates[activeRoute.coordinates.length - 1];
        pos = [coord[1], coord[0]];
      } else {
        // For middle stops, find building and calculate perpendicular point on route
        const buildingCenter = findBuildingCenter(stopName, datasets?.buildings);
        if (buildingCenter) {
          // buildingCenter is [lng, lat], find nearest point on path
          const nearestPoint = findNearestPointOnPolyline(buildingCenter[0], buildingCenter[1], path);
          if (nearestPoint) {
            pos = nearestPoint;
          } else {
            // Fallback: use coordinate at proportional index
            const coordIdx = Math.round(i * (activeRoute.coordinates.length - 1) / (totalStops - 1));
            const coord = activeRoute.coordinates[coordIdx];
            pos = [coord[1], coord[0]];
          }
        } else {
          // Fallback: use coordinate at proportional index
          const coordIdx = Math.round(i * (activeRoute.coordinates.length - 1) / (totalStops - 1));
          const coord = activeRoute.coordinates[coordIdx];
          pos = [coord[1], coord[0]];
        }
      }
      
      if (!pos) return;
      
      const markerSize = isFirst || isLast ? 32 : 26;
      const borderWidth = isFirst || isLast ? 4 : 3;
      
      const marker = new AMap.Marker({
        position: pos,
        content: `<div class="route-marker" style="
          width: ${markerSize}px; height: ${markerSize}px;
          background: linear-gradient(135deg, ${routeColor} 0%, ${darkenColor(routeColor, 30)} 100%);
          border: ${borderWidth}px solid #fff;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #fff;
          font-size: ${isFirst || isLast ? '12' : '10'}px;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(0,0,0,0.25), 0 0 0 2px ${routeColor}40;
          position: relative;
        ">
          ${isFirst ? '起' : isLast ? '终' : i + 1}
          ${isFirst || isLast ? `<div style="
            position: absolute;
            top: -6px; right: -6px;
            width: 12px; height: 12px;
            background: ${isFirst ? '#22c55e' : '#ef4444'};
            border: 2px solid #fff;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          "></div>` : ''}
        </div>`,
        offset: new AMap.Pixel(-markerSize / 2, -markerSize / 2),
        zIndex: isFirst || isLast ? 170 : 165
      });

      marker.on('click', () => {
        onRouteStopSelect?.({ name: stopName, index: i, total: totalStops });
      });

      marker.on('mouseover', () => {
        infoWindowRef.current.setContent(`<div class="campus-tooltip">${stopName}</div>`);
        infoWindowRef.current.open(map, pos);
      });

      marker.on('mouseout', () => {
        infoWindowRef.current.close();
      });

      map.add(marker);
      newRouteOverlays.push(marker);
    });

    routeOverlaysRef.current = newRouteOverlays;

  }, [activeRoute, amapLoaded, datasets, onRouteStopSelect]);

  // 5. Handle focusName (Fly to selected building)
  useEffect(() => {
    const targetName = typeof focusName === 'string' ? focusName : focusName?.name;
    if (!targetName || !datasets || !mapRef.current || !amapLoaded) return;

    const feature = datasets.buildings.features.find(item => {
      const buildingName = item.properties?.displayName || '';
      return buildingName.includes(targetName) || targetName.includes(buildingName);
    });

    if (feature) {
      setSelectedBuilding(feature);
      const center = featureCenterAMap(feature);
      mapRef.current.setZoomAndCenter(19, center, false, 650);
    }
  }, [focusName, datasets, setSelectedBuilding, amapLoaded]);

  // 6. Handle is3D and mapStyle toggles (Transitions camera tilt/rotation and extrusion/styling)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !amapLoaded) return;

    // In route mode, always use 3D camera angle
    const effectiveIs3D = is3D || !!activeRoute;

    // Update camera angle
    if (effectiveIs3D) {
      map.setPitch(55);
      map.setRotation(15);
      glCustomLayerRef.current?.show();
    } else {
      map.setPitch(0);
      map.setRotation(0);
      glCustomLayerRef.current?.hide();
    }

    // Update building heights and colors dynamically without recreating overlays
    buildingOverlaysRef.current.forEach(overlay => {
      const feature = overlay.getExtData();
      const isSelected = selectedBuilding?.properties?.mapId === feature.properties?.mapId;
      const isField = feature.properties?.name?.includes('田径场');
      
      let height;
      let fillColor;
      let strokeColor;
      let fillOpacity;
      
      if (activeRoute) {
        // Mixed mode: route stops are 3D, others are 2D
        const isRouteStop = isRouteStopBuilding(feature, activeRoute);
        if (isRouteStop) {
          if (isField) {
            height = 0;
            fillColor = isSelected ? '#1e6258' : '#e28b75';
            fillOpacity = 0.8;
            strokeColor = isSelected ? '#1e6258' : '#fffdf6';
          } else {
            height = 15;
            fillColor = isSelected ? '#1e6258' : 'transparent';
            fillOpacity = isSelected ? 0.35 : 0.001;
            strokeColor = isSelected ? '#1e6258' : 'transparent';
          }
        } else {
          // Non-route buildings: 2D white flat
          height = 0;
          fillOpacity = 0.98;
          fillColor = isSelected ? '#1e6258' : '#ffffff';
          strokeColor = '#cbd5e1';
        }
      } else if (is3D) {
        if (isField) {
          height = 0;
          fillColor = isSelected ? '#1e6258' : (mapStyle === 'white' ? '#f1f5f9' : '#e28b75');
          fillOpacity = 0.8;
          strokeColor = isSelected ? '#1e6258' : (mapStyle === 'white' ? '#cbd5e1' : '#fffdf6');
        } else {
          height = 15;
          fillColor = isSelected ? '#1e6258' : 'transparent';
          fillOpacity = isSelected ? 0.35 : 0.001;
          strokeColor = isSelected ? '#1e6258' : 'transparent';
        }
      } else {
        height = 0;
        fillOpacity = 0.96;
        if (mapStyle === 'white') {
          fillColor = isSelected ? '#1e6258' : '#ffffff';
          strokeColor = '#cbd5e1';
        } else {
          fillColor = isSelected ? '#1e6258' : (categoryColors[feature.properties?.category] || '#c8c5b8');
          strokeColor = '#fffdf6';
        }
      }

      overlay.setOptions({
        height: height,
        fillColor: fillColor,
        strokeColor: strokeColor,
        strokeWeight: isSelected ? 2 : 1.2,
        fillOpacity: fillOpacity
      });
    });
  }, [is3D, mapStyle, selectedBuilding, amapLoaded, activeRoute]);

  // Custom Zoom Handlers
  const handleZoomIn = () => {
    const map = mapRef.current;
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = mapRef.current;
    if (map) map.zoomOut();
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {!amapLoaded && (
        <div className="standalone-loading">
          <span></span>
          <p>正在加载高德地图……</p>
        </div>
      )}
      <div 
        ref={rootRef} 
        style={{ width: '100%', height: '100%', background: '#e8ece2' }} 
      />
      {amapLoaded && (
        <div className="map-controls-group">
          <div className="map-zoom-buttons">
            <button onClick={handleZoomIn} aria-label="放大">+</button>
            <button onClick={handleZoomOut} aria-label="缩小">−</button>
          </div>
          
          {!activeRoute && (
            <div className="map-view-switch">
              <button 
                className={!is3D ? 'active' : ''} 
                onClick={() => setIs3D(false)}
              >
                2D
              </button>
              <button 
                className={is3D ? 'active' : ''} 
                onClick={() => setIs3D(true)}
              >
                3D
              </button>
            </div>
          )}

          <div className="map-style-switch">
            <button 
              className={mapStyle === 'color' ? 'active' : ''} 
              onClick={() => setMapStyle('color')}
            >
              彩色
            </button>
            <button 
              className={mapStyle === 'white' ? 'active' : ''} 
              onClick={() => setMapStyle('white')}
            >
              白模
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
