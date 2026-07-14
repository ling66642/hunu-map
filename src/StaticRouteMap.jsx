import React, { forwardRef, useMemo } from 'react';
import RouteModelLayer from './RouteModelLayer';

const SVG_WIDTH = 1600;
const SVG_HEIGHT = 1100;
const MAP_BOX = { x: 300, y: 170, width: 1000, height: 755 };
const MAP_TILT = 0.64;
const MAP_SHEAR = 0.15;

const categoryPalette = {
  library: { roof: '#d9a96f', side: '#a97848' },
  sports: { roof: '#c97f68', side: '#98554a' },
  dining: { roof: '#d9b75e', side: '#a88b40' },
  residence: { roof: '#8eb4a7', side: '#638b7f' },
  teaching: { roof: '#d7c8aa', side: '#a99b7f' },
  service: { roof: '#c9c6ba', side: '#969388' },
};

// 静态地图中途经点显示名覆盖（仅影响标签展示，不影响建筑匹配 / 3D 模型 / 坐标）。
// 交互地图保持不变，仍显示“研五舍”。
const STATIC_ROUTE_STOP_DISPLAY = {
  '研五舍': '木兰楼',
};

// 静态地图中路线名称覆盖（仅影响标签展示，交互地图仍显示“路线A”等）。
const STATIC_ROUTE_LABEL = {
  routeA: '校园漫步路线A',
  routeB: '校园漫步路线B',
  routeC: '校园漫步路线C',
  routeD: '校园漫步路线D',
  routeE: '校园漫步路线E',
};

// 静态地图中各途经点的建筑介绍（取自《建筑介绍.docx》）。
// 键名使用 routes.js 中的原途经点名（originalName）：
//   - 「中和楼」途经点按用户确认采用文档中的“中和楼（天文台）”段落；
//   - 「江湾体育场」采用文档中的“江湾体育馆”段落。
// 文档中无对应条目的途经点（研究生院、教务处、体育场1、江边三舍、研五舍等）不显示介绍。
const buildingIntroductions = {
  '逸夫图书馆': '湖南师范大学图书馆的前身是1938年建立的国立师范学院图书馆。现在的逸夫图书馆于1991年11月落成，由邵逸夫先生捐资500万港币兴建，这是当时湖南高校中面积最大、设施最全的图书馆，也是邵逸夫先生在湖南捐建的首个教育项目。图书馆在2004年和2014年经历了两次扩建，并在2024年荣获“全国古籍重点保护单位”称号。截至2020年底，其纸质馆藏达415.8万册，订购各类文献数据库115个。',
  '文渊楼': '文渊楼是文学院与历史文化学院的所在地。该建筑红墙黛瓦，古木掩映，富有幽静的诗意。其入口处有一副由校友、湖湘诗词名家吴容甫撰联、书法名家胡昌华挥毫的黑花岗岩底鎏金楹联。文学院底蕴深厚，其前身可追溯至国立师范学院的国文系。',
  '经纬楼': '经纬楼是地理科学学院的教学楼。该学院源于1938年的国立师范学院史地系。学院实力雄厚，其地理科学专业是继北京师范大学之后，全国第二家通过教育部师范类专业三级认证的专业；地理科学、人文地理与城乡规划、土地资源管理专业为国家级一流本科专业建设点。学院拥有地理学一级学科博士点和博士后科研流动站，地理学科是湖南省“十四五”重点学科，在教育部第五轮学科评估中位居全国前列，并建有2个湖南省重点实验室。',
  '学生活动中心': '湖南师范大学学生活动中心位于江边的励德楼内，于2009年从木兰路搬迁至此。这里是校内最大的活动场地，为文艺比赛、培训讲堂、职场招聘、会议展览、晚会典礼等各类文娱活动提供场地和技术支持。自投入使用以来，已累计承办校内外千余场大小活动。',
  '外国语学院': '外国语学院始建于1938年，位于腾龙楼。学院成就卓著：2007年，英语语言文学成为国家重点学科；2017年和2022年，外国语言文学两次入选国家“世界一流”建设学科，是湖南省属高校唯一进入国家“双一流”建设的学科；2018年，教师团队入选教育部首批“全国高校黄大年式教师团队”（全国外语类仅2个）；2019年，学院获“全国教育系统先进集体”（当年全国唯一获此殊荣的高校外国语学院）；2021年，英语系获“全国三八红旗集体”。',
  '廉心公园': '廉心公园是湖南师范大学校园内一处精巧雅致的园林景观。公园虽面积不大，但设计有镂空景墙、圆拱门、木廊亭等元素，并悬挂有多副富含文化气息的楹联。它是师生课余休憩、感受校园文化氛围的理想场所，也是学校开展清廉文化教育的重要阵地。',
  '校史展览馆': '校史展览馆位于二里半校区里仁楼北侧2层。它始建于2008年，为迎接70周年校庆而建。2018年，在80周年校庆之际进行了重新扩建布展。展馆由“师范弦歌”、“鸿基初创”等九大展区组成，通过大量图片和实物，系统展示了学校从国立师范学院至今的发展历程。2024年，展馆因场地提质改造而闭馆施工。',
  '理学院': '湖南师范大学理学院的历史可追溯到1938年国立师范学院的理化系。1996年，数学系和计算中心合并成立理学院。2002年，理学院分立，组建了数学与统计学院、物理与电子科学学院等。从这里走出了包括3名中国科学院院士、1名中国工程院院士以及20余位国家杰青和长江学者在内的大批杰出校友。',
  '国际学术报告厅': '国际学术报告厅是学校举办高水平学术会议、国际交流及重要典礼的核心场所。公共管理学院等多个学院的毕业典礼暨学位授予仪式均在此举行。为确保设施设备的先进性与安全性，报告厅在2019年和2026年均进行过维修改造工程。',
  '忠烈祠': '麓山忠烈祠位于湖南师范大学校内。其前身为纪念岳飞的岳王庙，于1939年改建为忠烈祠，以纪念在淞沪会战中牺牲的国民革命军第四路军将士。该祠于1997年被列为全国重点文物保护单位，并于2020年入选第三批国家级抗战纪念设施名录。祠内匾额“允武且仁”由近代书法家谭泽闿书丹。',
  '景德楼': '景德楼是法学院、马克思主义学院和公共管理学院的所在地。这三个学院是学校哲学社会科学研究的重要力量。其中，法学院由原法学院与湖南政法管理干部学院于2002年合并组建而成。景德楼内定期举办各类高层次学术会议，如2025年在此举行了哲学学院成立仪式暨建构中国自主哲学知识体系研讨会',
  '中和楼': '中和楼是湖南师范大学的标志性建筑之一，原名为天文台，始建于1991年。它位于老理化楼的中心楼顶位置，是学校的重要科研、教学和科普设施。2014年，由于发展需要，学校决定按照修旧如旧的原则拆除老理化楼重建，新的天文馆仍建在原址，建有40公分折反式天文望远镜和大型全可动式穹顶，按照长沙的地理纬度进行定位设计，可高精度自动跟踪观测月球、行星、太阳及其他恒星和星团、星云等天体，是目前中南地区规格最高，功能最强的天文馆。',
  '江湾体育场': '江湾体育馆是湖南师范大学最新建成的大型现代化体育馆，于2024年5月竣工启用。该馆总建筑面积19,907.04平方米，主馆三层，设有活动看台3,932座、固定看台735座，中央场地可容纳2,000余人，主馆可同时容纳7,000余人。场馆集室内跑道、篮球场等多种功能于一体。启用后，已成功承办全国青少年三大球运动会等国家级赛事，以及学校毕业典礼、新年联欢会等大型活动。',
};

function cleanName(name) {
  if (!name || name === 'None') return '';
  const bracketName = name.match(/[（(]\s*([^()（）]*[\u4e00-\u9fa5][^()（）]*)\s*[)）]/);
  const result = (bracketName ? bracketName[1] : name)
    .replace(/^Hunan Normal University'?s?\s*/i, '')
    .replace(/^湖南师范大学/, '')
    .trim();
  const remap = { '高师楼': '中和楼' };
  return remap[result] || result;
}

function classify(name = '') {
  if (/图书馆|校史|忠烈祠|红楼/.test(name)) return 'library';
  if (/体育|活动中心|运动|江湾|田径场/.test(name)) return 'sports';
  if (/食堂|餐厅|小桃园/.test(name)) return 'dining';
  if (/舍|宿舍|公寓|苑/.test(name)) return 'residence';
  if (/学院|楼|研究所|教务处|研究生院|报告厅|工学院|幼儿园|系/.test(name) || name.toLowerCase().includes('university')) return 'teaching';
  return 'service';
}

function walkCoordinates(coordinates, visitor) {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === 'number') {
    visitor(coordinates);
    return;
  }
  coordinates.forEach((item) => walkCoordinates(item, visitor));
}

function getBounds(boundary) {
  const bounds = { minLng: Infinity, minLat: Infinity, maxLng: -Infinity, maxLat: -Infinity };
  boundary?.features?.forEach((feature) => {
    walkCoordinates(feature.geometry?.coordinates, ([lng, lat]) => {
      bounds.minLng = Math.min(bounds.minLng, lng);
      bounds.minLat = Math.min(bounds.minLat, lat);
      bounds.maxLng = Math.max(bounds.maxLng, lng);
      bounds.maxLat = Math.max(bounds.maxLat, lat);
    });
  });
  return bounds;
}

function createProjection(bounds) {
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const longitudeScale = Math.cos(centerLat * Math.PI / 180);
  const geoWidth = (bounds.maxLng - bounds.minLng) * longitudeScale;
  const geoHeight = bounds.maxLat - bounds.minLat;
  const centerX = MAP_BOX.x + MAP_BOX.width / 2;
  const centerY = MAP_BOX.y + MAP_BOX.height / 2;
  const angle = -7.5 * Math.PI / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tiltPoint = (x, y) => {
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    return [rotatedX + rotatedY * MAP_SHEAR, rotatedY * MAP_TILT];
  };
  const corners = [
    [-geoWidth / 2, -geoHeight / 2],
    [geoWidth / 2, -geoHeight / 2],
    [geoWidth / 2, geoHeight / 2],
    [-geoWidth / 2, geoHeight / 2],
  ].map(([x, y]) => tiltPoint(x, y));
  const projectedWidth = Math.max(...corners.map(([x]) => x)) - Math.min(...corners.map(([x]) => x));
  const projectedHeight = Math.max(...corners.map(([, y]) => y)) - Math.min(...corners.map(([, y]) => y));
  const scale = Math.min(MAP_BOX.width / projectedWidth, MAP_BOX.height / projectedHeight) * 1.22;

  return ([lng, lat]) => {
    const rawX = (lng - centerLng) * longitudeScale;
    const rawY = -(lat - centerLat);
    const [tiltedX, tiltedY] = tiltPoint(rawX, rawY);
    return [
      centerX + tiltedX * scale,
      centerY + tiltedY * scale,
    ];
  };
}

function ringPath(ring, project, close = true) {
  if (!ring?.length) return '';
  const points = ring.map(project);
  return `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')}${close ? ' Z' : ''}`;
}

function geometryPath(geometry, project) {
  if (!geometry) return '';
  const { type, coordinates } = geometry;
  if (type === 'LineString') return ringPath(coordinates, project, false);
  if (type === 'MultiLineString') return coordinates.map((line) => ringPath(line, project, false)).join(' ');
  if (type === 'Polygon') return coordinates.map((ring) => ringPath(ring, project, true)).join(' ');
  if (type === 'MultiPolygon') return coordinates.flatMap((polygon) => polygon.map((ring) => ringPath(ring, project, true))).join(' ');
  return '';
}

function featureCenter(feature) {
  const points = [];
  walkCoordinates(feature?.geometry?.coordinates, (coordinate) => points.push(coordinate));
  if (!points.length) return null;
  const sum = points.reduce((result, [lng, lat]) => [result[0] + lng, result[1] + lat], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function nameMatches(source, target) {
  if (!source || !target) return false;
  const normalize = (value) => value.replace(/^体育场(?=\d)/, '田径场').replace(/\s+/g, '');
  const normalizedSource = normalize(source);
  const normalizedTarget = normalize(target);
  return normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
}

function findBuilding(buildings, stopName) {
  return buildings.find((feature) => nameMatches(cleanName(feature.properties?.name), stopName));
}

function getStopAnchors(route, buildings, project) {
  if (!route.stops.length) return [];
  return route.stops.map((name, index) => {
    const building = findBuilding(buildings, name);
    const fallbackIndex = Math.round(index * Math.max(0, route.coordinates.length - 1) / Math.max(1, route.stops.length - 1));
    const routeCoordinate = route.coordinates[fallbackIndex];
    const coordinate = building ? featureCenter(building) : routeCoordinate ? [routeCoordinate[1], routeCoordinate[0]] : null;
    return {
      name: STATIC_ROUTE_STOP_DISPLAY[name] || name, // 仅显示名覆盖为“木兰楼”
      originalName: name, // 保留原名用于建筑匹配与描述查询
      index,
      coordinate,
      building,
      point: coordinate ? project(coordinate) : [MAP_BOX.x + MAP_BOX.width / 2, MAP_BOX.y + MAP_BOX.height / 2],
    };
  });
}

const CALLOUT_CARD_W = 244;
const CALLOUT_LEFT_X = 46;
const CALLOUT_RIGHT_X = 1310;
const CALLOUT_TEXT_X_OFFSET = 48;
const CALLOUT_TEXT_MAX_W = 182;
const CALLOUT_INTRO_LINE_H = 15.5;
const CALLOUT_COL_TOP = 196;
const CALLOUT_GAP = 16;

// 按当前字号估算每行可容纳宽度，对建筑介绍做 SVG 手动换行。
function wrapIntro(text, maxWidth) {
  if (!text) return [];
  const CJK = 12.74;
  const ASCII = 6.5;
  const lines = [];
  let current = '';
  let width = 0;
  for (const ch of text) {
    const charWidth = /[　-鿿＀-￯]/.test(ch) ? CJK : ASCII;
    if (width + charWidth > maxWidth && current) {
      lines.push(current);
      current = ch;
      width = charWidth;
    } else {
      current += ch;
      width += charWidth;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// 将引线下卡片按左右两栏非重叠堆叠：左栏放地图左半侧的途经点，右栏放右半侧，
// 每栏从上到下依次排列，卡片高度随介绍行数动态变化，避免互相遮挡。
function arrangeCallouts(anchors) {
  if (!anchors.length) return [];
  const orderedByX = [...anchors].sort((a, b) => a.point[0] - b.point[0]);
  const leftCount = Math.ceil(anchors.length / 2);
  const leftIds = new Set(orderedByX.slice(0, leftCount).map((item) => item.index));
  const groups = {
    left: anchors.filter((item) => leftIds.has(item.index)).sort((a, b) => a.point[1] - b.point[1]),
    right: anchors.filter((item) => !leftIds.has(item.index)).sort((a, b) => a.point[1] - b.point[1]),
  };
  const positions = [];
  Object.entries(groups).forEach(([side, items]) => {
    let prevBottom = CALLOUT_COL_TOP - CALLOUT_GAP;
    items.forEach((item) => {
      const intro = buildingIntroductions[item.originalName] || '';
      const lines = wrapIntro(intro, CALLOUT_TEXT_MAX_W);
      const height = 44 + lines.length * CALLOUT_INTRO_LINE_H + 10;
      const top = prevBottom + CALLOUT_GAP;
      positions.push({ ...item, side, cardTop: top, cardHeight: height, centerY: top + height / 2 });
      prevBottom = top + height;
    });
  });
  return positions;
}

function routePath(route, project) {
  if (!route.coordinates.length) return '';
  return ringPath(route.coordinates.map(([lat, lng]) => [lng, lat]), project, false);
}

function BuildingLayer({ features, modelReady, route, project }) {
  const stopNames = route.id === 'none' ? new Set() : new Set(route.stops);
  const prepared = features
    .map((feature) => {
      const name = cleanName(feature.properties?.name);
      const center = featureCenter(feature);
      const projectedCenter = center ? project(center) : [0, 0];
      const isStop = [...stopNames].some((stop) => nameMatches(name, stop));
      const category = classify(name);
      return {
        feature,
        projectedCenter,
        isStop,
        path: geometryPath(feature.geometry, project),
        palette: categoryPalette[category],
      };
    })
    .sort((a, b) => a.projectedCenter[1] - b.projectedCenter[1]);
  const flatBuildings = prepared.filter((item) => !item.isStop || !modelReady);

  return (
    <g className="buildings-layer">
      <g className="flat-buildings">
        {flatBuildings.map(({ feature, isStop, path, palette }, index) => (
          <path
            key={feature.properties?.id || index}
            d={path}
            fill={isStop ? route.color : palette.roof}
            fillRule="evenodd"
            stroke="#f7f2e7"
            strokeWidth={isStop ? 2 : 1.25}
            opacity={isStop ? 0.72 : 0.78}
          />
        ))}
      </g>
    </g>
  );
}

function labelsOverlap(first, second) {
  const padding = 2;
  return !(
    first.right + padding < second.left
    || first.left - padding > second.right
    || first.bottom + padding < second.top
    || first.top - padding > second.bottom
  );
}

function arrangeOverviewLabels(features, project) {
  let unnamedIndex = 0;
  const candidates = [
    { dx: 0, dy: -12, anchor: 'middle' },
    { dx: 0, dy: 19, anchor: 'middle' },
    { dx: 11, dy: 4, anchor: 'start' },
    { dx: -11, dy: 4, anchor: 'end' },
    { dx: 15, dy: -14, anchor: 'start' },
    { dx: -15, dy: -14, anchor: 'end' },
    { dx: 17, dy: 19, anchor: 'start' },
    { dx: -17, dy: 19, anchor: 'end' },
    { dx: 0, dy: -29, anchor: 'middle' },
    { dx: 0, dy: 36, anchor: 'middle' },
    { dx: 30, dy: -7, anchor: 'start' },
    { dx: -30, dy: -7, anchor: 'end' },
    { dx: 31, dy: 29, anchor: 'start' },
    { dx: -31, dy: 29, anchor: 'end' },
    { dx: 0, dy: -47, anchor: 'middle' },
    { dx: 0, dy: 53, anchor: 'middle' },
  ];
  const placed = [];
  const labels = features
    .map((feature, index) => {
      const cleanedName = cleanName(feature.properties?.name);
      const name = cleanedName || `建筑 ${String(++unnamedIndex).padStart(2, '0')}`;
      const center = featureCenter(feature);
      return center ? {
        feature,
        id: feature.properties?.id || index,
        name,
        unnamed: !cleanedName,
        point: project(center),
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.point[1] - b.point[1] || a.point[0] - b.point[0]);

  return labels.map((item) => {
    const labelWidth = [...item.name].reduce((width, character) => width + (character.codePointAt(0) <= 0xff ? 5.2 : 9.2), 8);
    const options = candidates.map((candidate) => {
      const x = item.point[0] + candidate.dx;
      const y = item.point[1] + candidate.dy;
      const left = candidate.anchor === 'start' ? x : candidate.anchor === 'end' ? x - labelWidth : x - labelWidth / 2;
      const bounds = { left, right: left + labelWidth, top: y - 10, bottom: y + 3 };
      const collisions = placed.filter((placedBounds) => labelsOverlap(bounds, placedBounds)).length;
      const withinMap = bounds.left >= MAP_BOX.x + 3
        && bounds.right <= MAP_BOX.x + MAP_BOX.width - 3
        && bounds.top >= MAP_BOX.y + 3
        && bounds.bottom <= MAP_BOX.y + MAP_BOX.height - 3;
      return { ...candidate, x, y, bounds, collisions, withinMap };
    });
    const selected = options.find((option) => option.withinMap && option.collisions === 0)
      || options.filter((option) => option.withinMap).sort((a, b) => a.collisions - b.collisions)[0]
      || options[0];
    placed.push(selected.bounds);
    return { ...item, ...selected };
  });
}

function OverviewLabels({ features, project }) {
  const labels = arrangeOverviewLabels(features, project);

  return (
    <g className="overview-labels">
      {labels.map(({ id, name, unnamed, point, x, y, anchor, dx, dy }) => (
        <g key={id}>
          {(Math.abs(dx) > 12 || Math.abs(dy) > 20) && (
            <line x1={point[0]} y1={point[1]} x2={x} y2={y - 4} stroke="#62766f" strokeWidth="0.75" opacity="0.55" />
          )}
          <circle cx={point[0]} cy={point[1]} r="2.7" fill={unnamed ? '#9a8560' : '#184f48'} stroke="#fffaf0" strokeWidth="1" />
          <text x={x} y={y} textAnchor={anchor} className={unnamed ? 'unnamed-building-label' : ''}>{name}</text>
        </g>
      ))}
    </g>
  );
}

function RouteEndpoints({ route, project }) {
  if (route.coordinates.length < 2) return null;
  const mapCenterX = MAP_BOX.x + MAP_BOX.width / 2;
  // 起点/终点文字根据途经点在地图中的左右位置，自动朝向地图内部（避开两侧的介绍卡片）。
  const endpoints = [
    {
      key: 'start', label: '起点', short: '起', color: '#16835d', coordinate: route.coordinates[0],
      leftOffset: { offsetX: 21, offsetY: -23, anchor: 'start' },
      rightOffset: { offsetX: -21, offsetY: -23, anchor: 'end' },
    },
    {
      key: 'end', label: '终点', short: '终', color: '#c43b36', coordinate: route.coordinates.at(-1),
      leftOffset: { offsetX: 21, offsetY: 31, anchor: 'start' },
      rightOffset: { offsetX: -21, offsetY: 31, anchor: 'end' },
    },
  ];

  return (
    <g className="route-endpoints">
      {endpoints.map((endpoint) => {
        const [lat, lng] = endpoint.coordinate;
        const point = project([lng, lat]);
        const onRight = point[0] >= mapCenterX;
        const cfg = onRight ? endpoint.rightOffset : endpoint.leftOffset;
        return (
          <g key={endpoint.key} transform={`translate(${point[0]} ${point[1]})`}>
            <circle r="18" fill="#fffaf0" opacity="0.98" />
            <circle r="14" fill={endpoint.color} stroke="#fff" strokeWidth="2.2" />
            <text y="5" textAnchor="middle" className="endpoint-letter">{endpoint.short}</text>
            <text
              x={cfg.offsetX}
              y={cfg.offsetY}
              textAnchor={cfg.anchor}
              className="endpoint-label"
            >
              {endpoint.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function RouteCallouts({ callouts, route }) {
  return (
    <g className="route-callouts">
      {callouts.map((item) => {
        const isLeft = item.side === 'left';
        const cardX = isLeft ? CALLOUT_LEFT_X : CALLOUT_RIGHT_X;
        const cardWidth = CALLOUT_CARD_W;
        const targetX = isLeft ? cardX + cardWidth : cardX;
        const elbowX = isLeft ? MAP_BOX.x - 9 : MAP_BOX.x + MAP_BOX.width + 9;
        const numberX = cardX + 27;
        const textX = cardX + CALLOUT_TEXT_X_OFFSET;
        const intro = buildingIntroductions[item.originalName] || '';
        const lines = wrapIntro(intro, CALLOUT_TEXT_MAX_W);
        return (
          <g key={item.name}>
            <polyline
              points={`${item.point[0]},${item.point[1]} ${elbowX},${item.centerY} ${targetX},${item.centerY}`}
              fill="none"
              stroke={route.color}
              strokeWidth="1.8"
              opacity="0.72"
            />
            <circle cx={item.point[0]} cy={item.point[1]} r="7" fill="#fffdf7" stroke={route.color} strokeWidth="3" />
            <rect x={cardX} y={item.cardTop} width={cardWidth} height={item.cardHeight} rx="8" fill="#fbf8ef" stroke="#d8d0bf" />
            <rect x={cardX} y={item.cardTop} width="5" height={item.cardHeight} rx="2.5" fill={route.color} />
            <circle cx={numberX} cy={item.cardTop + 25} r="14" fill={route.color} />
            <text x={numberX} y={item.cardTop + 30} textAnchor="middle" className="callout-number">{item.index + 1}</text>
            <text x={textX} y={item.cardTop + 27} className="callout-name">{item.name}</text>
            {lines.map((line, index) => (
              <text key={index} x={textX} y={item.cardTop + 44 + index * CALLOUT_INTRO_LINE_H} className="callout-intro">{line}</text>
            ))}
          </g>
        );
      })}
    </g>
  );
}

const StaticRouteMap = forwardRef(function StaticRouteMap({ datasets, modelReady, onModelReadyChange, route }, ref) {
  const { boundary, buildings, roads, water } = datasets;
  const bounds = useMemo(() => getBounds(boundary), [boundary]);
  const project = useMemo(() => createProjection(bounds), [bounds]);
  const boundaryPath = useMemo(() => boundary.features.map((feature) => geometryPath(feature.geometry, project)).join(' '), [boundary, project]);
  const stopAnchors = useMemo(() => getStopAnchors(route, buildings.features, project), [route, buildings, project]);
  const callouts = useMemo(() => arrangeCallouts(stopAnchors), [stopAnchors]);
  const activeRoutePath = useMemo(() => routePath(route, project), [route, project]);
  const modelAnchors = useMemo(() => buildings.features.map((feature, index) => ({
    id: String(index + 1),
    point: project(featureCenter(feature)),
  })), [buildings, project]);
  const modelBuildingIds = useMemo(() => new Set(buildings.features
    .map((feature, index) => ({ feature, id: String(index + 1) }))
    .filter(({ feature }) => route.stops.some((stop) => nameMatches(cleanName(feature.properties?.name), stop)))
    .map(({ id }) => id)), [buildings, route]);
  const descriptionLines = route.description.length > 27
    ? [route.description.slice(0, 27), route.description.slice(27)]
    : [route.description];

  return (
    <svg
      ref={ref}
      className="static-route-map"
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      role="img"
      aria-label={`${route.posterTitle}静态校园地图`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="paperGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f3e9" />
          <stop offset="1" stopColor="#ebe4d4" />
        </linearGradient>
        <linearGradient id="campusGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8ead8" />
          <stop offset="1" stopColor="#d9deca" />
        </linearGradient>
        <pattern id="paperNoise" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="5" r="0.7" fill="#9c927c" opacity="0.12" />
          <circle cx="18" cy="15" r="0.55" fill="#9c927c" opacity="0.1" />
        </pattern>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#385049" floodOpacity="0.18" />
        </filter>
        <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <clipPath id="campusClip"><path d={boundaryPath} /></clipPath>
        <clipPath id="photoClip"><rect x="6" y="6" width="188" height="128" rx="4" /></clipPath>
        <marker id="routeArrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0.8,0.8 L8.2,4.5 L0.8,8.2 Z" fill={route.color} stroke="#fffaf3" strokeWidth="0.8" />
        </marker>
        <style>{`
          text { font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif; }
          .poster-kicker { font-size: 18px; font-weight: 700; letter-spacing: 7px; fill: #8b6b32; }
          .poster-title { font-family: "STSong", "SimSun", serif; font-size: 53px; font-weight: 700; letter-spacing: 5px; fill: #173f3a; }
          .poster-subtitle { font-size: 14px; font-weight: 700; letter-spacing: 4px; fill: #7f887f; }
          .poster-description { font-size: 17px; fill: #586761; }
          .overview-labels text { font-size: 9.2px; font-weight: 700; fill: #38554e; paint-order: stroke; stroke: #f4f0e5; stroke-width: 3.2px; stroke-linejoin: round; }
          .overview-labels .unnamed-building-label { font-size: 8.2px; font-weight: 600; fill: #8a7452; }
          .callout-number { font-size: 14px; font-weight: 800; fill: #fff; }
          .callout-name { font-family: "STSong", "SimSun", serif; font-size: 18px; font-weight: 700; fill: #24433d; }
          .callout-intro { font-family: "STKaiti", "KaiTi", "楷体", "Kaiti SC", sans-serif; font-size: 13px; letter-spacing: 0.4px; fill: #5a6b65; }
          .endpoint-letter { font-size: 12px; font-weight: 800; fill: #fff; }
          .endpoint-label { font-size: 13px; font-weight: 800; fill: #284a43; paint-order: stroke; stroke: #fffaf0; stroke-width: 4px; stroke-linejoin: round; }
          .route-model-layer { pointer-events: none; }
          .legend-label { font-size: 12px; fill: #52625d; }
          .map-note { font-size: 11px; letter-spacing: 1.5px; fill: #758078; }
          .route-meta { font-size: 13px; font-weight: 700; letter-spacing: 1px; fill: #4c5e58; }
        `}</style>
      </defs>

      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#paperGradient)" />
      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#paperNoise)" />
      <path d="M44 42 H1556 V1058 H44 Z" fill="none" stroke="#b9ad94" strokeWidth="1.4" />
      <path d="M57 55 H1543 V1045 H57 Z" fill="none" stroke="#d6cdbb" strokeWidth="0.8" />

      <g transform="translate(78 76)">
        <rect width="88" height="88" rx="10" fill="#174b45" />
        <text x="44" y="59" textAnchor="middle" fontFamily="STKaiti, KaiTi, serif" fontSize="43" fontWeight="700" fill="#f4e4bd">师</text>
      </g>
      <text x="193" y="93" className="poster-kicker">湖南师范大学 · 二里半校区</text>
      <text x="193" y="151" className="poster-title">{STATIC_ROUTE_LABEL[route.id] || route.posterTitle}</text>
      <text x="196" y="183" className="poster-subtitle">{route.subtitle}</text>

      <g transform="translate(1080 76)">
        <rect width="430" height="103" rx="9" fill="#f8f4ea" stroke="#d4cbb8" />
        <rect width="7" height="103" rx="3.5" fill={route.color} />
        <text x="27" y="31" className="route-meta">{route.id === 'none' ? '校园静态总览' : `${route.shortTitle} · ${route.time} · ${route.stops.length} 个途经点`}</text>
        <text x="27" y="58" fontSize="13" fill="#66736d">
          {descriptionLines.map((line, index) => <tspan key={line} x="27" dy={index ? 22 : 0}>{line}</tspan>)}
        </text>
      </g>

      <g filter="url(#softShadow)">
        <path d={boundaryPath} transform="translate(10 14)" fill="#64746b" opacity="0.18" />
        <path d={boundaryPath} fill="url(#campusGradient)" stroke="#fffaf0" strokeWidth="9" strokeLinejoin="round" />
        <path d={boundaryPath} fill="none" stroke="#506c62" strokeWidth="2.2" strokeLinejoin="round" />
      </g>

      <g clipPath="url(#campusClip)">
        <g className="water-layer">
          {water.features.map((feature, index) => <path key={index} d={geometryPath(feature.geometry, project)} fill="#b9d8d6" stroke="#99c5c3" strokeWidth="1.5" fillRule="evenodd" />)}
        </g>
        <g className="road-layer">
          {roads.features.map((feature, index) => {
            const highway = feature.properties?.highway;
            const major = highway === 'secondary' || highway === 'residential';
            const path = geometryPath(feature.geometry, project);
            return (
              <g key={feature.properties?.id || index}>
                <path d={path} fill="none" stroke="#b3aa97" strokeWidth={major ? 9 : 4.5} strokeLinecap="round" strokeLinejoin="round" opacity="0.72" />
                <path d={path} fill="none" stroke="#f6f0df" strokeWidth={major ? 5.5 : 2.4} strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
              </g>
            );
          })}
        </g>
        {activeRoutePath && (
          <g className="route-line-layer">
            <path d={activeRoutePath} fill="none" stroke={route.color} strokeWidth="16" opacity="0.14" strokeLinecap="round" strokeLinejoin="round" filter="url(#routeGlow)" />
            <path d={activeRoutePath} fill="none" stroke="#fffaf3" strokeWidth="10.5" opacity="0.95" strokeLinecap="round" strokeLinejoin="round" />
            <path d={activeRoutePath} fill="none" stroke={route.color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#routeArrow)" />
            <path d={activeRoutePath} fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.5" strokeDasharray="3 11" strokeLinecap="round" />
          </g>
        )}
        <BuildingLayer features={buildings.features} modelReady={modelReady} route={route} project={project} />
      </g>

      <RouteModelLayer
        active={route.id !== 'none'}
        anchors={modelAnchors}
        color={route.color}
        modelBuildingIds={modelBuildingIds}
        onReadyChange={onModelReadyChange}
        routeId={route.id}
      />

      {route.id === 'none' ? <OverviewLabels features={buildings.features} project={project} /> : <RouteCallouts callouts={callouts} route={route} />}

      {route.id !== 'none' && stopAnchors.map((item) => (
        <g key={item.name} transform={`translate(${item.point[0]} ${item.point[1]})`}>
          <circle r="17" fill="#fffaf0" opacity="0.96" />
          <circle r="13" fill={route.color} stroke="#fff" strokeWidth="2" />
          <text y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{item.index + 1}</text>
        </g>
      ))}

      {route.id !== 'none' && <RouteEndpoints route={route} project={project} />}

      {/* 校园实景插图：路线A 5(文渊楼)与6(经纬楼)之间的法桐大道秋景 */}
      <g transform="translate(1060 720)" filter="url(#softShadow)">
        <rect width="200" height="168" rx="8" fill="#fffdf7" stroke="#d8d0bf" strokeWidth="1.5" />
        <image href="/images/road_bg.jpg" x="6" y="6" width="188" height="128" preserveAspectRatio="xMidYMid slice" clipPath="url(#photoClip)" />
        <rect x="6" y="134" width="188" height="28" rx="0" fill="#f8f4e9" />
        <text x="100" y="152" textAnchor="middle" className="map-note" style={{ fontSize: '11px', letterSpacing: '1px' }}>法桐大道 · 文渊楼—经纬楼</text>
      </g>

      <g transform="translate(338 966)">
        <rect width={route.id === 'none' ? 650 : 750} height="43" rx="7" fill="#f8f4e9" stroke="#d7cfbe" />
        <text x="15" y="27" className="map-note">图例 / LEGEND</text>
        <g transform="translate(126 14)">
          <rect width="21" height="15" rx="2" fill="#d7c8aa" stroke="#f7f2e7" />
          <text x="30" y="12" className="legend-label">普通建筑（2D）</text>
          {route.id !== 'none' && (
            <>
              <path d="M142 4 H164 V19 H142 Z" transform="translate(4 5)" fill="#704b40" opacity="0.9" />
              <path d="M142 4 H164 V19 H142 Z" fill={route.color} stroke="#fffaf0" strokeWidth="1.5" />
              <text x="176" y="12" className="legend-label">真实模型（3D）</text>
              <line x1="300" y1="8" x2="337" y2="8" stroke="#fffaf3" strokeWidth="9" strokeLinecap="round" />
              <line x1="300" y1="8" x2="337" y2="8" stroke={route.color} strokeWidth="5" strokeLinecap="round" />
              <text x="348" y="12" className="legend-label">推荐路线</text>
              <circle cx="445" cy="8" r="7" fill="#16835d" stroke="#fff" strokeWidth="1.5" />
              <text x="457" y="12" className="legend-label">起点</text>
              <circle cx="522" cy="8" r="7" fill="#c43b36" stroke="#fff" strokeWidth="1.5" />
              <text x="534" y="12" className="legend-label">终点</text>
            </>
          )}
          {route.id === 'none' && (
            <>
              <line x1="142" y1="8" x2="178" y2="8" stroke="#f6f0df" strokeWidth="6" />
              <text x="188" y="12" className="legend-label">校园道路</text>
              <rect x="276" width="22" height="14" rx="7" fill="#b9d8d6" />
              <text x="307" y="12" className="legend-label">水系</text>
              <circle cx="365" cy="7" r="3" fill="#9a8560" />
              <text x="377" y="12" className="legend-label">建筑 01：未命名建筑</text>
            </>
          )}
        </g>
      </g>

      <g transform="translate(1150 280)">
        <circle cx="38" cy="38" r="35" fill="#f8f4e9" stroke="#d1c7b2" />
        <path d="M38 9 L47 42 L38 36 L29 42 Z" fill="#174b45" />
        <text x="38" y="61" textAnchor="middle" fontSize="12" fontWeight="800" fill="#174b45">N</text>
      </g>

      <g transform="translate(1190 983)">
        <line x1="0" y1="0" x2="120" y2="0" stroke="#41554e" strokeWidth="3" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#41554e" strokeWidth="2" />
        <line x1="60" y1="-6" x2="60" y2="6" stroke="#41554e" strokeWidth="2" />
        <line x1="120" y1="-6" x2="120" y2="6" stroke="#41554e" strokeWidth="2" />
        <text x="0" y="22" textAnchor="middle" className="map-note">0</text>
        <text x="60" y="22" textAnchor="middle" className="map-note">100</text>
        <text x="120" y="22" textAnchor="middle" className="map-note">200m</text>
      </g>

      <line x1="84" y1="1022" x2="1516" y2="1022" stroke="#c8beaa" />
      <text x="84" y="1051" className="map-note">湖南师范大学二里半校区 · 静态路线成图系统</text>
      <text x="1516" y="1051" textAnchor="end" className="map-note">数据仅用于校园导览展示 · 2026</text>
    </svg>
  );
});

export default StaticRouteMap;

