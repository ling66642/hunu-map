import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Building2, Camera, ChevronLeft, ChevronRight, Dumbbell, GraduationCap,
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
  { id:'routeA', title:'路线A', time:'约30分钟', color:'#e11d48', stops:['逸夫图书馆','学生活动中心','高师楼','外国语学院','文渊楼','经纬楼'], coordinates:[[28.189459,112.942822],[28.188540,112.942847],[28.188500,112.941733],[28.190229,112.941654],[28.190202,112.940641],[28.192290,112.940672],[28.192308,112.942940]] },
  { id:'routeB', title:'路线B', time:'约40分钟', color:'#7c3aed', stops:['逸夫图书馆','江湾体育场','体育场1','江边三舍','廉心公园'], coordinates:[[28.189448,112.942783],[28.187586,112.942854],[28.187626,112.944079],[28.187255,112.945925],[28.186980,112.947517],[28.186972,112.947617],[28.188525,112.947972],[28.190149,112.948245],[28.190845,112.948357],[28.190791,112.948762]] },
  { id:'routeC', title:'路线C', time:'约25分钟', color:'#0891b2', stops:['逸夫图书馆','校史展览馆','理学院','国际学术报告厅'], coordinates:[[28.189442,112.942737],[28.188654,112.942776],[28.188694,112.943884],[28.188654,112.943962],[28.188591,112.943981],[28.187769,112.944040],[28.187500,112.944182],[28.186906,112.944325],[28.186706,112.944487],[28.186118,112.944720],[28.186346,112.945446],[28.186215,112.945614],[28.186215,112.945634],[28.186912,112.946236],[28.186963,112.946424],[28.186866,112.947085],[28.186855,112.947215],[28.186683,112.947513],[28.186689,112.947506]] },
  { id:'routeD', title:'路线D', time:'约20分钟', color:'#ca8a04', stops:['经纬楼','研究生院','景德楼','忠烈祠','教务处'], coordinates:[[28.192520,112.943353],[28.192166,112.943087],[28.192697,112.942562],[28.193343,112.942264],[28.193388,112.941551],[28.193423,112.941325],[28.193508,112.941027],[28.193623,112.940871],[28.193663,112.940696],[28.193651,112.940508],[28.193623,112.940359],[28.193548,112.940301],[28.193440,112.940320],[28.193314,112.940398],[28.193246,112.940515],[28.193183,112.940554],[28.192275,112.940664],[28.192235,112.939906],[28.192178,112.939620],[28.192149,112.939446],[28.192212,112.939232],[28.192395,112.938953]] },
  { id:'routeE', title:'路线E', time:'约18分钟', color:'#059669', stops:['逸夫图书馆','研五舍','高师楼','文渊楼','经纬楼','忠烈祠'], coordinates:[[28.189485,112.942794],[28.189931,112.942769],[28.189894,112.941690],[28.190676,112.941682],[28.190852,112.941620],[28.190853,112.941539],[28.191572,112.941532],[28.191584,112.941448],[28.191669,112.941428],[28.191726,112.941474],[28.191749,112.941519],[28.192244,112.941504],[28.192321,112.941533],[28.192303,112.940678],[28.192683,112.940625]] }
];

const routeStopDetails = {
  '逸夫图书馆': {
    image: '/images/buildings/yifu-library.jpg',
    eyebrow: '书香地标 · 图书文化',
    description: '从路线的第一站开始，在林荫与书香之间认识二里半校区。照片卡片会跟随路线节点，为每一站补充更直观的校园印象。',
    tags: ['校园地标', '图书文化', '推荐拍照点']
  }
};

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
  const [activeRouteStop,setActiveRouteStop]=useState(null);
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

  // 选中推荐路线后，地图仅绘制该路线途经点对应的建筑。
  // 此处使用完整建筑数据匹配，避免侧栏的分类或搜索条件误隐藏途经建筑。
  const mapBuildings=useMemo(()=>{
    if (route.id==='none') return buildings;

    const stops=route.stops.map(stop=>stop.trim()).filter(Boolean);
    return datasets?.buildings.features.filter(feature=>{
      const name=(feature.properties?.displayName||'').trim();
      return name&&stops.some(stop=>name.includes(stop)||stop.includes(name));
    })||[];
  },[datasets,buildings,route]);

  const showRouteStop=useCallback((stop)=>{
    setActiveRouteStop(stop);
    setSelected(null);
  },[]);

  const selectRoute=(nextRoute)=>{
    setRoute(nextRoute);
    setSelected(null);
    setActiveRouteStop(nextRoute.id==='none'||!nextRoute.stops.length?null:{
      name:nextRoute.stops[0],
      index:0,
      total:nextRoute.stops.length
    });
  };

  const changeRouteStop=(step)=>{
    if(!activeRouteStop||route.id==='none') return;
    const nextIndex=activeRouteStop.index+step;
    if(nextIndex<0||nextIndex>=route.stops.length) return;
    showRouteStop({name:route.stops[nextIndex],index:nextIndex,total:route.stops.length});
  };

  const activeRouteStopDetails=activeRouteStop?routeStopDetails[activeRouteStop.name]:null;

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
                onClick={() => selectRoute(r)}
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
        {!datasets?<div className="standalone-loading"><span></span><p>正在绘制校园地图……</p></div>:<MapContainer datasets={datasets} buildings={mapBuildings} selectedBuilding={selected} setSelectedBuilding={setSelected} activeRoute={route.id==='none'?null:route} focusName={focusName} onRouteStopSelect={showRouteStop}/>}
        <div className="standalone-legend"><b>图例</b><span><i className="teaching"></i>教学科研</span><span><i className="library"></i>图书文化</span><span><i className="sports"></i>体育活动</span><span><i className="dining"></i>餐饮生活</span><span><i className="residence"></i>学生宿舍</span></div>
        {activeRouteStop&&<section className="route-photo-card">
          <div className={`route-photo-media ${activeRouteStopDetails?'has-photo':'is-placeholder'}`}>
            {activeRouteStopDetails?<img src={activeRouteStopDetails.image} alt={activeRouteStop.name}/>:<div className="route-photo-placeholder"><Camera size={32}/><span>这处途经点的照片即将补充</span></div>}
            <div className="route-photo-shade"></div>
            <button className="route-photo-close" onClick={()=>setActiveRouteStop(null)} aria-label="关闭照片卡片"><X size={17}/></button>
            <div className="route-photo-heading">
              <span style={{'--route-accent':route.color}}>{route.title} · 第 {activeRouteStop.index+1} 站</span>
              <h2>{activeRouteStop.name}</h2>
            </div>
          </div>
          <div className="route-photo-content">
            <p>{activeRouteStopDetails?.eyebrow||'校园途经点 · 照片待补充'}</p>
            <div className="route-photo-description">{activeRouteStopDetails?.description||'这里将展示建筑照片、校园故事和游览提示，让推荐路线的每一个节点都更有记忆点。'}</div>
            {activeRouteStopDetails&&<div className="route-photo-tags">{activeRouteStopDetails.tags.map(tag=><span key={tag}>{tag}</span>)}</div>}
            <div className="route-photo-footer">
              <span>{activeRouteStop.index+1} / {activeRouteStop.total}</span>
              <div>
                <button onClick={()=>changeRouteStop(-1)} disabled={activeRouteStop.index===0} aria-label="上一站"><ChevronLeft size={17}/></button>
                <button onClick={()=>changeRouteStop(1)} disabled={activeRouteStop.index===activeRouteStop.total-1} aria-label="下一站"><ChevronRight size={17}/></button>
              </div>
            </div>
          </div>
        </section>}
        {selected&&<section className="standalone-detail"><button onClick={()=>setSelected(null)}><X size={16}/></button><p>{categories.find(c=>c.id===selected.properties.category)?.label||'校园设施'}</p><h2>{selected.properties.displayName}</h2><div><MapPin size={15}/>湖南师范大学二里半校区</div><span>点击地图空白区域可继续浏览，滚轮缩放查看建筑与道路细节。</span></section>}
      </main>
    </div>
  </div>
}
