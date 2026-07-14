import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Building2, Camera, ChevronLeft, ChevronRight, Dumbbell, GraduationCap,
  Layers3, MapPin, Menu, Route, Search, Utensils, X
} from 'lucide-react';
import MapContainer from './components/MapContainer';
import { routes } from './data/routes';

const categories = [
  { id: 'all', label: '全部', icon: Layers3 },
  { id: 'teaching', label: '教学科研', icon: GraduationCap },
  { id: 'library', label: '图书文化', icon: BookOpen },
  { id: 'sports', label: '体育活动', icon: Dumbbell },
  { id: 'dining', label: '餐饮生活', icon: Utensils },
  { id: 'residence', label: '学生宿舍', icon: Building2 },
];

const routeStopDetails = {
  '逸夫图书馆': {
    image: '/images/buildings/yifu-library.jpg',
    eyebrow: '书香地标 · 图书文化',
    description: '从路线的第一站开始，在林荫与书香之间认识二里半校区。照片卡片会跟随路线节点，为每一站补充更直观的校园印象。',
    tags: ['校园地标', '图书文化', '推荐拍照点']
  },
  '学生活动中心': {
    image: '/images/buildings/student-center.jpg',
    eyebrow: '青年汇聚 · 青春活力',
    description: '学生活动中心位于江边的励德楼内。这里是校内最大的活动场地，为文艺比赛、培训讲堂、职场招聘、会议展览、晚会典礼等各类文娱活动提供场地和技术支持。',
    tags: ['青年汇聚', '文化交流', '活动大厅']
  },
  '中和楼': {
    image: '/images/buildings/zhonghe-building.jpg',
    eyebrow: '历史见证 · 学术积淀',
    description: '中和楼是标志性建筑之一，原名天文台。建有40公分折反式天文望远镜和大型全可动式穹顶，高精度自动跟踪观测天体，是目前中南地区规格最高，功能最强的天文馆。',
    tags: ['标志建筑', '师大天文馆', '天眼观测']
  },
  '外国语学院': {
    image: '/images/buildings/foreign-languages.jpg',
    eyebrow: '中西交融 · 语言摇篮',
    description: '外国语学院始建于1938年，位于腾龙楼。2017年和2022年，外国语言文学两次入选国家“世界一流”建设学科，是湖南省属高校唯一进入国家“双一流”建设的学科。',
    tags: ['世界一流', '外国语言文学', '腾龙楼']
  },
  '文渊楼': {
    image: '/images/buildings/wenyuan-building.jpg',
    eyebrow: '学术殿堂 · 严谨求实',
    description: '文渊楼是文学院与历史文化学院所在地。建筑红墙黛瓦，古木掩映，富有幽静的诗意。其入口处有一副由名家撰联书写的黑花岗岩底鎏金楹联。',
    tags: ['红墙黛瓦', '人文底蕴', '古木掩映']
  },
  '经纬楼': {
    image: '/images/buildings/jingwei-building.jpg',
    eyebrow: '经天纬地 · 地理学科',
    description: '经纬楼是地理科学学院的教学楼。学院实力雄厚，地理学科是湖南省“十四五”重点学科，在教育部第五轮学科评估中位居全国前列。',
    tags: ['国家一流专业', '重点实验室', '科研殿堂']
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
  const result = match ? match[1].trim() : name.replace(/^Hunan Normal University'?s?\s*/i,'').trim();
  const remap = { '高师楼': '中和楼' };
  return remap[result] || result;
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

  // 选中推荐路线后，地图显示全部建筑：途经建筑以3D白模展示，其余建筑以2D平面展示。
  const mapBuildings=useMemo(()=>{
    if (route.id==='none') return buildings;
    return datasets?.buildings.features||[];
  },[datasets,buildings,route]);

  const showRouteStop=useCallback((stop)=>{
    setActiveRouteStop(stop);
    setSelected(null);
    setFocusName({ name: stop.name, requestedAt: Date.now() });
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

  const locate=(feature)=>{
    setSelected(feature);
    setFocusName({ name: feature.properties.displayName, requestedAt: Date.now() });
  };

  return <div className="standalone-map-app">
    <header className="map-topbar">
      <a className="map-brand" href="/"><img src="/images/师大校徽.webp" alt="湖南师范大学校徽" className="map-seal" /><span><strong>湖南师范大学</strong><small>二里半校园地图</small></span></a>
      <div className="map-top-title"><MapPin size={16}/><span>二里半校区</span><em>75栋建筑 · 专属矢量底图</em></div>
      <nav className="map-view-switch" aria-label="地图模式切换"><a className="active" href="/map.html"><MapPin size={14}/>交互地图</a><a href="/poster.html"><Camera size={14}/>静态成图</a></nav>
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
              <div
                key={r.id}
                className={`route-card ${route.id === r.id ? 'active' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={route.id === r.id}
                onClick={() => selectRoute(r)}
                onKeyDown={(event)=>{
                  if(event.key!=='Enter'&&event.key!==' ') return;
                  event.preventDefault();
                  selectRoute(r);
                }}
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
                      <span
                        key={i}
                        className={`route-stop-tag ${activeRouteStop?.index===i?'active':''}`}
                        role="button"
                        tabIndex={0}
                        onClick={(event)=>{
                          event.stopPropagation();
                          showRouteStop({name:stop,index:i,total:r.stops.length});
                        }}
                        onKeyDown={(event)=>{
                          if(event.key!=='Enter'&&event.key!==' ') return;
                          event.preventDefault();
                          event.stopPropagation();
                          showRouteStop({name:stop,index:i,total:r.stops.length});
                        }}
                      >
                        <span className="route-stop-num" style={{ background: r.color }}>{i + 1}</span>
                        {stop}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
