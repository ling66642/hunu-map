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
  { id:'classic', title:'一小时经典漫游', time:'约60分钟', color:'#d9a441', stops:['至善楼','江湾体育场','逸夫图书馆','校史展览馆','之谟图书馆'], coordinates:[[28.187753,112.942338],[28.188062,112.943556],[28.189526,112.943409],[28.188555,112.945827],[28.189499,112.946065]] },
  { id:'humanities', title:'半日人文书香线', time:'约2.5小时', color:'#2e7b68', stops:['红楼','文渊楼','研究生院','逸夫图书馆','校史展览馆','忠烈祠'], coordinates:[[28.194614,112.941740],[28.191933,112.941411],[28.193609,112.942487],[28.189526,112.943409],[28.188555,112.945827],[28.192641,112.940282]] },
  { id:'vitality', title:'运动活力线', time:'约90分钟', color:'#df6b4f', stops:['学生活动中心','江湾体育场','任邦柱体育馆','之谟图书馆','江边步道'], coordinates:[[28.188796,112.941339],[28.188062,112.943556],[28.189082,112.946171],[28.189499,112.946065],[28.190464,112.948565]] },
  { id:'culture', title:'校园文化游（红色线）', time:'约2小时', color:'#dc2626', stops:['湖南师范大学','分析测试中心','校医院','廉心公园','附属小学','附属中学','学堂坡警务室'], coordinates:[[28.187753,112.942338],[28.188500,112.943200],[28.189200,112.944000],[28.190000,112.945000],[28.190800,112.944500],[28.191600,112.943800],[28.192400,112.944200]] },
  { id:'community', title:'社区人文游（蓝色线）', time:'约2.5小时', color:'#2563eb', stops:['麓山村','向阳坡','槐树坡','新华村','师大社区居民委员会','长盛花园','英姿羽毛球'], coordinates:[[28.194000,112.942000],[28.193200,112.942800],[28.192400,112.943600],[28.191600,112.944400],[28.190800,112.944000],[28.190000,112.943200],[28.189200,112.942400]] },
  { id:'river', title:'江景休闲游（绿色线）', time:'约1.5小时', color:'#16a34a', stops:['桃子湖路','临江花园','桂花路','廉心公园','湖南师范大学'], coordinates:[[28.187000,112.941000],[28.186200,112.941800],[28.185400,112.942600],[28.190000,112.945000],[28.187753,112.942338]] }
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
