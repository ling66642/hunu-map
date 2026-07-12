import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Building2, ChevronDown, Clock3, Compass,
  Dumbbell, GraduationCap, Landmark, Map, MapPin, Menu, Route,
  Search, Trees, Utensils, X
} from 'lucide-react';
import MapContainer from './components/MapContainer';

const categories = [
  { id: 'all', label: '全部建筑', icon: Map },
  { id: 'teaching', label: '教学科研', icon: GraduationCap },
  { id: 'library', label: '图书文化', icon: BookOpen },
  { id: 'sports', label: '体育活动', icon: Dumbbell },
  { id: 'dining', label: '餐饮生活', icon: Utensils },
  { id: 'residence', label: '学生宿舍', icon: Building2 },
];

const routePlans = [
  {
    id: 'classic', time: '约 60 分钟', title: '一小时经典漫游',
    subtitle: '从至善楼出发，串联二里半最具代表性的校园地标',
    color: '#d9a441', stops: ['至善楼', '江湾体育场', '逸夫图书馆', '校史展览馆', '之谟图书馆'],
    coordinates: [[28.187753,112.942338],[28.188062,112.943556],[28.189526,112.943409],[28.188555,112.945827],[28.189499,112.946065]]
  },
  {
    id: 'humanities', time: '约 2.5 小时', title: '半日人文书香线',
    subtitle: '穿行图书馆、学院与历史建筑，感受湖师大的人文气息',
    color: '#2e7b68', stops: ['红楼', '文渊楼', '研究生院', '逸夫图书馆', '校史展览馆', '忠烈祠'],
    coordinates: [[28.194614,112.941740],[28.191933,112.941411],[28.193609,112.942487],[28.189526,112.943409],[28.188555,112.945827],[28.192641,112.940282]]
  },
  {
    id: 'vitality', time: '约 90 分钟', title: '运动活力线',
    subtitle: '连接江湾体育场、体育馆与学生活动空间',
    color: '#df6b4f', stops: ['学生活动中心', '江湾体育场', '任邦柱体育馆', '之谟图书馆', '江边步道'],
    coordinates: [[28.188796,112.941339],[28.188062,112.943556],[28.189082,112.946171],[28.189499,112.946065],[28.190464,112.948565]]
  }
];

const landmarks = [
  { name: '江湾体育场', en: 'JIANGWAN STADIUM', category: '运动地标', desc: '二里半校区核心体育空间，承载日常训练、赛事与校园集体活动。', tone: 'stadium' },
  { name: '逸夫图书馆', en: 'YIFU LIBRARY', category: '书香校园', desc: '校区重要学习与文献服务空间，是师生日常阅读、自习的热门地点。', tone: 'library' },
  { name: '至善楼', en: 'ZHISHAN BUILDING', category: '教学建筑', desc: '位于校区南部的代表性教学建筑，连接理学院与江湾片区。', tone: 'hall' },
  { name: '校史展览馆', en: 'UNIVERSITY HISTORY', category: '历史文化', desc: '通过校史陈列了解学校办学历程、学术传统与师大精神。', tone: 'history' },
  { name: '之谟图书馆', en: 'ZHIMO LIBRARY', category: '历史建筑', desc: '校园中富有人文辨识度的建筑节点，与周边绿地共同构成静谧空间。', tone: 'archive' },
  { name: '任邦柱体育馆', en: 'REN BANGZHU GYM', category: '体育设施', desc: '综合性室内运动场馆，是校园体育教学和文体活动的重要载体。', tone: 'gym' },
];

function classifyBuilding(name = '') {
  const n = name.toLowerCase();
  if (/图书馆|校史|忠烈祠|红楼/.test(name)) return 'library';
  if (/体育|活动中心|运动|江湾/.test(name)) return 'sports';
  if (/食堂|餐厅|小桃园/.test(name)) return 'dining';
  if (/舍|宿舍|公寓|苑/.test(name)) return 'residence';
  if (/学院|楼|研究所|教务处|研究生院|报告厅|工学院|幼儿园|系/.test(name) || n.includes('university')) return 'teaching';
  return 'service';
}

function cleanName(name) {
  if (!name || name === 'None') return '校园建筑';
  const match = name.match(/[（(]\s*([^()（）]*[\u4e00-\u9fa5][^()（）]*)\s*[)）]/);
  if (match) return match[1].trim();
  return name.replace(/^Hunan Normal University'?s?\s*/i, '').trim();
}

export default function App() {
  const [datasets, setDatasets] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [category, setCategory] = useState('all');
  const [activeRoute, setActiveRoute] = useState(routePlans[0]);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mapFocusName, setMapFocusName] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/erliban_boundary.geojson').then((res) => res.json()),
      fetch('/data/erliban_buildings.geojson').then((res) => res.json()),
      fetch('/data/erliban_roads.geojson').then((res) => res.json()),
      fetch('/data/erliban_water.geojson').then((res) => res.json())
    ]).then(([boundary, buildings, roads, water]) => {
      buildings.features = buildings.features.map((feature, index) => ({
        ...feature,
        properties: {
          ...feature.properties,
          displayName: cleanName(feature.properties?.name),
          category: classifyBuilding(feature.properties?.name || ''),
          mapId: `building-${index}`
        }
      }));
      setDatasets({ boundary, buildings, roads, water });
    }).catch(error => console.error('校园地图数据加载失败：', error));
  }, []);

  const filteredBuildings = useMemo(() => {
    if (!datasets) return [];
    return datasets.buildings.features.filter(feature => {
      const props = feature.properties;
      const categoryMatch = category === 'all' || props.category === category;
      const queryMatch = !query.trim() || props.displayName.toLowerCase().includes(query.trim().toLowerCase());
      return categoryMatch && queryMatch;
    });
  }, [datasets, category, query]);

  const jumpToLandmark = (name) => {
    setMapFocusName(name);
    document.querySelector('#campus-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="湖南师范大学二里半校园导览首页">
          <span className="brand-seal">师</span>
          <span><strong>湖南师范大学</strong><small>二里半校园导览</small></span>
        </a>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
          <a href="#campus-map" onClick={() => setMenuOpen(false)}>校园地图</a>
          <a href="#routes" onClick={() => setMenuOpen(false)}>推荐路线</a>
          <a href="#landmarks" onClick={() => setMenuOpen(false)}>地标建筑</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>生活服务</a>
        </nav>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="打开导航">
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-map-lines" aria-hidden="true"><span></span><span></span><span></span></div>
          <div className="hero-content">
            <p className="eyebrow"><span></span> HUNAN NORMAL UNIVERSITY</p>
            <h1>漫游<span>二里半</span></h1>
            <p className="hero-subtitle">一张专属于湖师大的校园底图<br />在山水洲城之间，遇见书香与青春</p>
            <div className="hero-actions">
              <a className="primary-button" href="#campus-map"><Compass size={18}/> 开始探索 <ArrowRight size={18}/></a>
              <a className="text-button" href="#routes"><Route size={18}/> 查看推荐路线</a>
            </div>
          </div>
          <div className="hero-compass" aria-hidden="true"><i>N</i><span></span><b>28°11′N<br/>112°56′E</b></div>
          <div className="hero-stat"><strong>75</strong><span>栋建筑入图</span><em></em><strong>6</strong><span>类校园设施</span></div>
        </section>

        <section className="quick-nav" aria-label="页面快速导航">
          <a href="#campus-map"><Map size={22}/><span><b>校园地图</b><small>查找楼宇与设施</small></span></a>
          <a href="#routes"><Route size={22}/><span><b>推荐路线</b><small>规划校园漫游</small></span></a>
          <a href="#landmarks"><Landmark size={22}/><span><b>地标建筑</b><small>认识师大校园</small></span></a>
          <a href="#services"><Trees size={22}/><span><b>生活服务</b><small>发现便利空间</small></span></a>
        </section>

        <section className="map-section section-wrap" id="campus-map">
          <div className="section-heading split-heading">
            <div><p className="section-kicker">CAMPUS MAP</p><h2>二里半校园地图</h2><p>基于校区建筑、道路、水体与边界矢量数据绘制的专属校园底图</p></div>
            <div className="map-search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索教学楼、图书馆、体育场……" /></div>
          </div>

          <div className="map-layout">
            <aside className="map-sidebar">
              <div className="sidebar-title"><span>建筑分类</span><small>{filteredBuildings.length} 个结果</small></div>
              <div className="category-list">
                {categories.map(item => {
                  const Icon = item.icon;
                  return <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)}><Icon size={17}/><span>{item.label}</span><ChevronDown size={14}/></button>
                })}
              </div>
              <div className="route-mini-card">
                <p><Route size={15}/> 当前推荐路线</p>
                <strong>{activeRoute.title}</strong><small>{activeRoute.stops.length} 个途经点 · {activeRoute.time}</small>
                <a href="#routes">切换路线 <ArrowRight size={14}/></a>
              </div>
            </aside>

            <div className="map-frame">
              {!datasets ? <div className="map-loading"><span></span><p>正在绘制二里半校园底图…</p></div> :
                <MapContainer datasets={datasets} buildings={filteredBuildings} selectedBuilding={selectedBuilding} setSelectedBuilding={setSelectedBuilding} activeRoute={activeRoute} focusName={mapFocusName} />}
              <div className="map-legend"><span><i className="legend-building"></i>校园建筑</span><span><i className="legend-water"></i>水体</span><span><i className="legend-route"></i>推荐路线</span></div>
            </div>

            {selectedBuilding && <aside className="building-detail">
              <button className="detail-close" onClick={() => setSelectedBuilding(null)}><X size={17}/></button>
              <div className={`detail-visual ${selectedBuilding.properties.category}`}><Building2 size={40}/><span>HNU · ERLIBAN</span></div>
              <p className="detail-category">{categories.find(c => c.id === selectedBuilding.properties.category)?.label || '校园设施'}</p>
              <h3>{selectedBuilding.properties.displayName}</h3>
              <div className="detail-info"><MapPin size={16}/><span>湖南师范大学二里半校区内</span></div>
              <p className="detail-desc">该建筑已收录于二里半校园矢量底图。可通过地图缩放、拖动查看其与周边道路、建筑及校园空间的关系。</p>
              <button className="detail-route"><Route size={16}/> 设为游览目的地</button>
            </aside>}
          </div>
        </section>

        <section className="route-section" id="routes">
          <div className="section-wrap">
            <div className="section-heading light"><p className="section-kicker">WALKING ROUTES</p><h2>推荐校园漫游路线</h2><p>选择适合你的节奏，从不同侧面认识二里半</p></div>
            <div className="route-tabs">
              {routePlans.map((route, index) => <button key={route.id} className={activeRoute.id === route.id ? 'active' : ''} onClick={() => { setActiveRoute(route); document.querySelector('#campus-map')?.scrollIntoView({behavior:'smooth'}); }}><small>0{index+1}</small><span><b>{route.title}</b><em>{route.time}</em></span></button>)}
            </div>
            <div className="route-feature">
              <div><p className="route-number">ROUTE {String(routePlans.findIndex(r => r.id === activeRoute.id)+1).padStart(2,'0')}</p><h3>{activeRoute.title}</h3><p>{activeRoute.subtitle}</p><div className="route-meta"><span><Clock3 size={16}/>{activeRoute.time}</span><span><MapPin size={16}/>{activeRoute.stops.length} 个地标</span></div></div>
              <ol>{activeRoute.stops.map((stop, index) => <li key={stop}><span>{String(index+1).padStart(2,'0')}</span><b>{stop}</b></li>)}</ol>
            </div>
          </div>
        </section>

        <section className="landmark-section section-wrap" id="landmarks">
          <div className="section-heading split-heading"><div><p className="section-kicker">CAMPUS LANDMARKS</p><h2>地标建筑一览</h2><p>从熟悉的楼宇与空间，阅读湖师大的校园故事</p></div><button className="outline-button" onClick={() => {setCategory('all'); document.querySelector('#campus-map')?.scrollIntoView({behavior:'smooth'})}}>在地图中查看全部 <ArrowRight size={16}/></button></div>
          <div className="landmark-grid">
            {landmarks.map((item, index) => <article className="landmark-card" key={item.name} onClick={() => jumpToLandmark(item.name)}>
              <div className={`landmark-art ${item.tone}`}><span className="card-index">0{index+1}</span><div className="building-silhouette"><i></i><i></i><i></i></div><small>{item.en}</small></div>
              <div className="landmark-copy"><p>{item.category}</p><h3>{item.name}</h3><span>{item.desc}</span><button>地图定位 <MapPin size={14}/></button></div>
            </article>)}
          </div>
        </section>

        <section className="service-section" id="services">
          <div className="section-wrap service-inner">
            <div><p className="section-kicker">CAMPUS SERVICES</p><h2>校园生活，触手可及</h2><p>餐饮、阅读、运动与公共服务空间已分类收录在校园地图中。</p></div>
            <div className="service-links">
              <button onClick={() => {setCategory('dining'); document.querySelector('#campus-map')?.scrollIntoView({behavior:'smooth'})}}><Utensils/><span><b>餐饮服务</b><small>食堂 · 餐厅</small></span><ArrowRight/></button>
              <button onClick={() => {setCategory('library'); document.querySelector('#campus-map')?.scrollIntoView({behavior:'smooth'})}}><BookOpen/><span><b>阅读空间</b><small>图书馆 · 文化建筑</small></span><ArrowRight/></button>
              <button onClick={() => {setCategory('sports'); document.querySelector('#campus-map')?.scrollIntoView({behavior:'smooth'})}}><Dumbbell/><span><b>体育活动</b><small>体育馆 · 运动场</small></span><ArrowRight/></button>
            </div>
          </div>
        </section>
      </main>

      <footer><div className="footer-brand"><span className="brand-seal">师</span><span><strong>湖南师范大学</strong><small>二里半校园导览地图</small></span></div><p>本页面为校园导览设计示范 · 地图数据来源于本地二里半矢量底图</p><a href="#top">返回顶部 ↑</a></footer>
    </div>
  );
}

