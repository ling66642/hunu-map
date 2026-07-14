import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileCode2, Map, Printer, Route as RouteIcon } from 'lucide-react';
import StaticRouteMap from './StaticRouteMap';
import { routes } from './data/routes';

const datasetFiles = [
  ['boundary', '/data/erliban_boundary.geojson'],
  ['buildings', '/data/erliban_buildings.geojson'],
  ['roads', '/data/erliban_roads.geojson'],
  ['water', '/data/erliban_water.geojson'],
];

function fileName(route, extension) {
  const routeName = route.id === 'none' ? '校园总览' : route.posterTitle;
  return `湖南师范大学二里半校区_${routeName}.${extension}`;
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('图片资源转换失败'));
    };
    reader.onerror = () => reject(reader.error || new Error('图片资源读取失败'));
    reader.readAsDataURL(blob);
  });
}

async function serializeSvg(svgElement) {
  const clone = svgElement.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1600');
  clone.setAttribute('height', '1100');

  const images = [...clone.querySelectorAll('image[href]')];
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href');
    if (!href || href.startsWith('data:')) return;
    const response = await fetch(new URL(href, window.location.href));
    if (!response.ok) throw new Error(`图片资源加载失败（${response.status}）`);
    image.setAttribute('href', await blobToDataUrl(await response.blob()));
  }));

  return new XMLSerializer().serializeToString(clone);
}

export default function PosterApp() {
  const svgRef = useRef(null);
  const [datasets, setDatasets] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeRouteId, setActiveRouteId] = useState(() => {
    const routeId = new URLSearchParams(window.location.search).get('route');
    return routes.some((route) => route.id === routeId) ? routeId : 'routeA';
  });

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) || routes[1],
    [activeRouteId],
  );
  const routeIndex = routes.findIndex((route) => route.id === activeRoute.id);

  useEffect(() => {
    let disposed = false;
    Promise.all(datasetFiles.map(async ([key, url]) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} 加载失败（${response.status}）`);
      return [key, await response.json()];
    }))
      .then((entries) => {
        if (!disposed) setDatasets(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (!disposed) setLoadError(error.message || '静态地图数据加载失败');
      });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('route', activeRoute.id);
    window.history.replaceState(null, '', url);
  }, [activeRoute]);

  useEffect(() => {
    setModelReady(activeRoute.id === 'none');
  }, [activeRoute.id]);

  const selectRoute = (routeId) => {
    setActiveRouteId(routeId);
    setNotice('');
  };

  const changeRoute = (step) => {
    const nextIndex = (routeIndex + step + routes.length) % routes.length;
    selectRoute(routes[nextIndex].id);
  };

  const exportSvg = async () => {
    if (!svgRef.current || !modelReady) return;
    setNotice('正在嵌入图片资源并生成 SVG…');
    try {
      const source = await serializeSvg(svgRef.current);
      downloadBlob(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }), fileName(activeRoute, 'svg'));
      setNotice('SVG 版式文件已下载，背景图与三维模型均已嵌入。');
    } catch (error) {
      setNotice(`SVG 生成失败：${error.message || '未知错误'}。`);
    }
  };

  const exportPng = async () => {
    if (!svgRef.current || !modelReady || exporting) return;
    setExporting(true);
    setNotice('正在生成高清 PNG…');
    let url = '';
    try {
      const source = await serializeSvg(svgRef.current);
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      url = URL.createObjectURL(blob);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 3200;
      canvas.height = 2200;
      const context = canvas.getContext('2d');
      context.fillStyle = '#f4efe4';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!pngBlob) throw new Error('浏览器未能生成 PNG 文件');
      downloadBlob(pngBlob, fileName(activeRoute, 'png'));
      setNotice('3200 × 2200 高清 PNG 已下载。');
    } catch (error) {
      setNotice(`PNG 生成失败：${error.message || '未知错误'}。可先下载 SVG。`);
    } finally {
      if (url) URL.revokeObjectURL(url);
      setExporting(false);
    }
  };

  return (
    <div className="poster-page">
      <header className="poster-toolbar">
        <a className="poster-brand" href="/">
          <img src="/images/师大校徽.webp" alt="湖南师范大学校徽" className="poster-brand-seal" />
          <span><strong>湖南师范大学</strong><small>二里半校园导览</small></span>
        </a>

        <nav className="map-mode-switch" aria-label="地图模式切换">
          <a href="/map.html"><Map size={15} />交互地图</a>
          <a className="active" href="/poster.html"><RouteIcon size={15} />静态成图</a>
        </nav>

        <div className="poster-toolbar-actions">
          <button type="button" onClick={exportSvg} disabled={!datasets || !modelReady}><FileCode2 size={16} />下载 SVG</button>
          <button type="button" className="primary" onClick={exportPng} disabled={!datasets || !modelReady || exporting}><Download size={16} />{exporting ? '生成中…' : '下载高清 PNG'}</button>
          <button type="button" onClick={() => window.print()} disabled={!datasets || !modelReady}><Printer size={16} />打印</button>
        </div>
      </header>

      <section className="route-switcher" aria-label="静态成图路线选择">
        <button className="route-arrow" type="button" onClick={() => changeRoute(-1)} aria-label="上一张路线图"><ChevronLeft size={18} /></button>
        <div className="route-switcher-tabs">
          {routes.map((route) => (
            <button
              key={route.id}
              type="button"
              className={route.id === activeRoute.id ? 'active' : ''}
              style={{ '--route-color': route.color }}
              onClick={() => selectRoute(route.id)}
            >
              <span className="route-tab-dot" />
              <span><b>{route.shortTitle}</b><small>{route.id === 'none' ? '全校建筑' : route.posterTitle}</small></span>
            </button>
          ))}
        </div>
        <button className="route-arrow" type="button" onClick={() => changeRoute(1)} aria-label="下一张路线图"><ChevronRight size={18} /></button>
      </section>

      <main className="poster-workspace">
        <div className="poster-workspace-heading">
          <div>
            <span>STATIC MAP MAKER</span>
            <h1>路线静态成图</h1>
            <p>参考示例采用平面校园底图、真实建筑模型和两侧引线标注；切换路线即可生成对应成图。</p>
          </div>
          <div className="poster-current-route" style={{ '--route-color': activeRoute.color }}>
            <span>{String(routeIndex + 1).padStart(2, '0')} / {String(routes.length).padStart(2, '0')}</span>
            <strong>{activeRoute.posterTitle}</strong>
            <small>{activeRoute.id === 'none' ? '静态校园全景' : `${activeRoute.time} · ${activeRoute.stops.length} 个途经点`}</small>
          </div>
        </div>

        <div className="poster-sheet-wrap">
          {loadError ? (
            <div className="poster-state error"><strong>静态地图加载失败</strong><span>{loadError}</span></div>
          ) : datasets ? (
            <StaticRouteMap
              ref={svgRef}
              datasets={datasets}
              modelReady={modelReady}
              onModelReadyChange={setModelReady}
              route={activeRoute}
            />
          ) : (
            <div className="poster-state"><span className="poster-loader" /><strong>正在生成静态校园底图</strong><span>读取建筑、道路与水系矢量数据…</span></div>
          )}
        </div>

        <div className="poster-footer-tip">
          <span>{notice || 'SVG 保留矢量底图并嵌入高清三维模型；PNG 为 3200 × 2200 像素高清成图。'}</span>
          <span>路线数据与交互地图保持一致</span>
        </div>
      </main>
    </div>
  );
}
