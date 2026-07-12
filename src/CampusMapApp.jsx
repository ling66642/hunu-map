import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Building2, ChevronLeft, Dumbbell, GraduationCap,
  Layers3, MapPin, Menu, Route, Search, Utensils, X
} from 'lucide-react';
import MapContainer from './components/MapContainer';

const categories = [
  { id: 'all', label: '全部', icon: Layers3 },
  { id: 'teaching', label: '教学科研', icon: GraduationCap },
  { id: 'library', label: '图书文化', icon: BookOpen },
  { id: 'sports', label: '体育活动', icon: Dumbbell },
  { id: 'dining', label: '餐饮生活', icon: Utensils },
  { id: 'residence', label: '学生宿舍', icon: Building2 },
];

const routes = [
  { id:'none', title:'不显示路线', time:'自由探索', color:'#c89b48', stops:[], coordinates:[] },
  { id:'routeA', title:'路线A', time:'约30分钟', color:'#e11d48', stops:['逸夫图书馆','学生活动中心','高师楼','外国语学院','文渊楼','经纬楼'], coordinates:[[28.1897277,112.9437815],[28.1889974,112.9415335],[28.1906713,112.9424162],[28.1905588,112.9412069],[28.1920747,112.9415437],[28.1930329,112.9422117]] },
  { id:'routeB', title:'路线B', time:'约40分钟', color:'#7c3aed', stops:['逸夫图书馆','江湾体育场','体育场1','江边三舍','廉心公园'], coordinates:[[28.1897277,112.9437815],[28.1883003,112.9438707],[28.18848633970663,112.94764366589266],[28.1900442,112.9487965],[28.1903772,112.9483754]] },
  { id:'routeC', title:'路线C', time:'约25分钟', color:'#0891b2', stops:['逸夫图书馆','校史展览馆','理学院','国际学术报告厅'], coordinates:[[28.1897277,112.9437815],[28.1886934,112.9458491],[28.1872112,112.944877],[28.1869349,112.9449933]] },
  { id:'routeD', title:'路线D', time:'约20分钟', color:'#ca8a04', stops:['经纬楼','研究生院','景德楼','忠烈祠','教务处'], coordinates:[[28.1930329,112.9422117],[28.193682,112.9425807],[28.1929884,112.9409475],[28.1927119,112.9403691],[28.1921697,112.9400249]] },
  { id:'routeE', title:'路线E', time:'约18分钟', color:'#059669', stops:['逸夫图书馆','研五舍','高师楼','文渊楼','经纬楼','忠烈祠'], coordinates:[[28.1897277,112.9437815],[28.1922291,112.9405767],[28.1906713,112.9424162],[28.1920747,112.9415437],[28.1930329,112.9422117],[28.1927119,112.9403691]] }
];

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

function convertCoords(coordinates, type) {
  if (type === 'Point') {
    return wgs84ToGcj02(coordinates[0], coordinates[1]);
  } else if (type === 'LineString' || type === 'MultiPoint') {
    return coordinates.map(c => wgs84ToGcj02(c[0], c[1]));
  } else if (type === 'Polygon' || type === 'MultiLineString') {
    return coordinates.map(ring => ring.map(c => wgs84ToGcj02(c[0], c[1])));
  } else if (type === 'MultiPolygon') {
    return coordinates.map(poly => poly.map(ring => ring.map(c => wgs84ToGcj02(c[0], c[1]))));
  }
  return coordinates;
}

function convertGeoJSON(geojson) {
  if (!geojson) return geojson;
  const newGeojson = JSON.parse(JSON.stringify(geojson));
  if (newGeojson.features) {
    newGeojson.features.forEach(f => {
      if (f.geometry) {
        f.geometry.coordinates = convertCoords(f.geometry.coordinates, f.geometry.type);
      }
    });
  } else if (newGeojson.geometry) {
    newGeojson.geometry.coordinates = convertCoords(newGeojson.geometry.coordinates, newGeojson.geometry.type);
  }
  return newGeojson;
}

function classify(name='') {
  if (/图书馆|校史|忠烈祠|红楼/.test(name)) return 'library';
  if (/体育|活动中心|运动|江湾|田径场/.test(name)) return 'sports';
  if (/食堂|餐厅|小桃园/.test(name)) return 'dining';
  if (/舍|宿舍|公寓|苑/.test(name)) return 'residence';
  if (/学院|楼|研究所|教务处|研究生院|报告厅|工学院|幼儿园|系/.test(name) || name.toLowerCase().includes('university')) return 'teaching';
  return 'service';
}

function cleanName(name) {
  if (!name || name === 'None') return '校园建筑';
  const match = name.match(/[（(]\s*([^()（）]*[\u4e00-\u9fa5][^()（）]*)\s*[)）]/);
  return match ? match[1].trim() : name.replace(/^Hunan Normal University'?s?\s*/i,'').trim();
}

export default function CampusMapApp(){
  const [datasets,setDatasets]=useState(null);
  const [category,setCategory]=useState('all');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState(null);
  const [focusName,setFocusName]=useState(null);
  const [routeList, setRouteList] = useState(routes);
  const [route,setRoute]=useState(routes[0]);
  const [sidebarOpen,setSidebarOpen]=useState(true);

  useEffect(()=>{
    // Convert route coordinates to GCJ-02
    const gcjRoutes = routes.map(r => {
      if (!r.coordinates || r.coordinates.length === 0) return r;
      const newCoords = r.coordinates.map(c => {
        const [gcjLng, gcjLat] = wgs84ToGcj02(c[1], c[0]);
        return [gcjLat, gcjLng];
      });
      return { ...r, coordinates: newCoords };
    });
    setRouteList(gcjRoutes);
    setRoute(gcjRoutes[0]);

    Promise.all([
      fetch('/data/erliban_boundary.geojson').then(r=>r.json()),
      fetch('/data/erliban_buildings.geojson').then(r=>r.json()),
      fetch('/data/erliban_roads.geojson').then(r=>r.json()),
      fetch('/data/erliban_water.geojson').then(r=>r.json())
    ]).then(([boundary,buildings,roads,water])=>{
      const gcjBoundary = convertGeoJSON(boundary);
      const gcjBuildings = convertGeoJSON(buildings);
      const gcjRoads = convertGeoJSON(roads);
      const gcjWater = convertGeoJSON(water);

      gcjBuildings.features=gcjBuildings.features.map((f,i)=>({...f,properties:{...f.properties,displayName:cleanName(f.properties?.name),category:classify(f.properties?.name||''),mapId:`building-${i}`}}));
      setDatasets({boundary: gcjBoundary, buildings: gcjBuildings, roads: gcjRoads, water: gcjWater});
    });
  },[]);

  const buildings=useMemo(()=>datasets?.buildings.features.filter(f=>{
    const categoryMatch=category==='all'||f.properties.category===category;
    const searchMatch=!query.trim()||f.properties.displayName.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatch&&searchMatch;
  })||[],[datasets,category,query]);

  const locate=(feature)=>{setSelected(feature);setFocusName(feature.properties.displayName);};

  return <div className="standalone-map-app">
    <header className="map-topbar">
      <a className="map-brand" href="/"><span className="map-seal">师</span><span><strong>湖南师范大学</strong><small>二里半校园地图</small></span></a>
      <div className="map-top-title"><MapPin size={16}/><span>二里半校区</span><em>75栋建筑 · 专属矢量底图</em></div>
      <a className="back-home" href="/"><ChevronLeft size={17}/>返回导览首页</a>
      <button className="mobile-sidebar-toggle" onClick={()=>setSidebarOpen(!sidebarOpen)}>{sidebarOpen?<X/>:<Menu/>}</button>
    </header>

    <div className="map-workspace">
      <aside className={`standalone-sidebar ${sidebarOpen?'open':''}`}>
        <div className="standalone-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索校园建筑……" />{query&&<button onClick={()=>setQuery('')}><X size={14}/></button>}</div>
        <div className="standalone-categories">{categories.map(item=>{const Icon=item.icon;return <button className={category===item.id?'active':''} key={item.id} onClick={()=>setCategory(item.id)}><Icon size={16}/><span>{item.label}</span></button>})}</div>
        <div className="sidebar-section-head"><span>建筑列表</span><small>{buildings.length}个结果</small></div>
        <div className="building-list">{buildings.map(feature=><button key={feature.properties.mapId} className={selected?.properties.mapId===feature.properties.mapId?'active':''} onClick={()=>locate(feature)}><span className={`building-dot ${feature.properties.category}`}></span><span><b>{feature.properties.displayName}</b><small>{categories.find(c=>c.id===feature.properties.category)?.label||'校园设施'}</small></span><MapPin size={14}/></button>)}</div>
        <div className="route-selector">
          <p><Route size={15}/>推荐路线</p>
          <div className="route-cards">
            {routeList.map(r => (
              <button 
                key={r.id} 
                className={`route-card ${route.id === r.id ? 'active' : ''}`}
                onClick={() => setRoute(r)}
              >
                <div className="route-card-header">
                  <span className="route-color-dot" style={{ background: r.color }}></span>
                  <span className="route-card-title">{r.title}</span>
                </div>
                {r.id !== 'none' && (
                  <div className="route-card-info">
                    <span>{r.time}</span>
                    <span>{r.stops.length}个途经点</span>
                  </div>
                )}
                {r.id !== 'none' && route.id === r.id && (
                  <div className="route-stops-preview">
                    {r.stops.map((stop, i) => (
                      <span key={i} className="route-stop-tag">
                        <span className="route-stop-num" style={{ background: r.color }}>{i + 1}</span>
                        {stop}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="standalone-map-main">
        {!datasets?<div className="standalone-loading"><span></span><p>正在绘制校园地图……</p></div>:<MapContainer datasets={datasets} buildings={buildings} selectedBuilding={selected} setSelectedBuilding={setSelected} activeRoute={route.id==='none'?null:route} focusName={focusName}/>} 
        <div className="standalone-legend"><b>图例</b><span><i className="teaching"></i>教学科研</span><span><i className="library"></i>图书文化</span><span><i className="sports"></i>体育活动</span><span><i className="dining"></i>餐饮生活</span><span><i className="residence"></i>学生宿舍</span></div>
        {selected&&<section className="standalone-detail"><button onClick={()=>setSelected(null)}><X size={16}/></button><p>{categories.find(c=>c.id===selected.properties.category)?.label||'校园设施'}</p><h2>{selected.properties.displayName}</h2><div><MapPin size={15}/>湖南师范大学二里半校区</div><span>点击地图空白区域可继续浏览，滚轮缩放查看建筑与道路细节。</span></section>}
      </main>
    </div>
  </div>
}
