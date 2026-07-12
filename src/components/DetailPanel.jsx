import React from 'react';
import { X, Clock, MapPin, Award, CheckCircle2, Phone, Calendar, UserCheck } from 'lucide-react';

const CATEGORY_IMAGES = {
  'sports': {
    '田径场': 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
    '体育馆': 'https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=600&auto=format&fit=crop&q=80',
    '游泳馆': 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=600&auto=format&fit=crop&q=80',
    '篮球场': 'https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=600&auto=format&fit=crop&q=80',
    '乒乓球': 'https://images.unsplash.com/photo-1538388149352-0a6b4c379a52?w=600&auto=format&fit=crop&q=80',
    '羽毛球': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80',
    '网球': 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80',
    'default': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=80'
  },
  'gyms': {
    'default': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80'
  }
};

function getVenueImage(name, isSports) {
  if (!isSports) return CATEGORY_IMAGES.gyms.default;
  
  for (const key in CATEGORY_IMAGES.sports) {
    if (name.includes(key)) {
      return CATEGORY_IMAGES.sports[key];
    }
  }
  return CATEGORY_IMAGES.sports.default;
}

export default function DetailPanel({ venue, onClose }) {
  if (!venue) return null;

  const name = venue.properties.name || venue.properties.Name || "";
  const address = venue.properties.address || venue.properties.Address || "";
  const isSports = venue.properties.category === 'sports';
  
  // Custom mock details depending on name/type
  const isGym = !isSports;
  const openingHours = isSports ? "08:00 - 21:30" : "09:00 - 22:30";
  const bookingMethod = isSports 
    ? (name.includes('田径场') || name.includes('五舍') ? "自由进入 (免预约)" : "“湖南师大微体育”公众号预约")
    : "到店办理/美团团购";
    
  // Mock facilities list based on type
  let facilities = [];
  if (name.includes('田径场')) {
    facilities = ["400米标准塑胶跑道", "天然草坪足球场", "夜间照明大灯", "观众看台"];
  } else if (name.includes('篮球')) {
    facilities = ["标准户外塑胶篮球场", "夜间灯光", "防滑地面"];
  } else if (name.includes('游泳')) {
    facilities = ["50米标准室内泳池", "恒温系统", "更衣室 & 淋浴间", "专业救生员"];
  } else if (name.includes('羽毛球')) {
    facilities = ["室内塑胶羽毛球场", "防眩光照明", "球网配置"];
  } else if (isGym) {
    facilities = ["有氧训练区 (跑步机/椭圆机)", "自由力量区 (哑铃/杠铃)", "固定器械区", "体测服务"];
  } else {
    facilities = ["标准运动场地", "配套更衣室", "饮水机/自动售货机"];
  }

  // Crowdedness simulation based on name length (to give varied results)
  const crowdFactor = (name.length % 3); // 0, 1, 2
  let crowdPercent = 35;
  let crowdStatus = "畅通";
  let crowdClass = "low";
  let dotClass = "green";

  if (crowdFactor === 1) {
    crowdPercent = 65;
    crowdStatus = "适中";
    crowdClass = "medium";
    dotClass = "yellow";
  } else if (crowdFactor === 2) {
    crowdPercent = 85;
    crowdStatus = "拥挤";
    crowdClass = "medium"; // CSS bar class
    dotClass = "yellow";
  }

  const bgImage = getVenueImage(name, isSports);

  return (
    <section className="detail-panel">
      <button className="detail-close" onClick={onClose}>
        <X size={18} />
      </button>

      {/* Hero Image */}
      <div 
        className="detail-hero" 
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="detail-hero-overlay"></div>
      </div>

      {/* Content */}
      <div className="detail-content">
        <div className="detail-header">
          <span className={`detail-tag ${isSports ? 'sports' : 'gyms'}`}>
            {isSports ? '体育设施' : '健身房'}
          </span>
          <h2 className="detail-title">{name}</h2>
        </div>

        {/* Info Grid */}
        <div className="detail-info-grid">
          <div className="info-item">
            <div className="info-icon">
              <MapPin size={16} />
            </div>
            <div className="info-text">
              <h4>详细地址</h4>
              <p>{address || "湖南师范大学二里半校区内"}</p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Clock size={16} />
            </div>
            <div className="info-text">
              <h4>开放时间</h4>
              <p>{openingHours}</p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Calendar size={16} />
            </div>
            <div className="info-text">
              <h4>预约/进入方式</h4>
              <p>{bookingMethod}</p>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon">
              <Award size={16} />
            </div>
            <div className="info-text">
              <h4>场馆配置</h4>
              <ul style={{ listStyle: 'none', marginTop: '4px' }}>
                {facilities.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-sub)', marginBottom: '4px' }}>
                    <CheckCircle2 size={12} style={{ color: isSports ? 'var(--accent-sports)' : 'var(--accent-gyms)' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Live Status Card */}
        <div className="live-status">
          <div className="status-header">
            <span>实时拥挤度监测</span>
            <div className="status-indicator">
              <span className={`dot ${dotClass}`}></span>
              <span style={{ color: dotClass === 'green' ? '#10b981' : '#f59e0b' }}>
                {crowdStatus} ({crowdPercent}%)
              </span>
            </div>
          </div>
          <div className="status-bar-bg">
            <div 
              className={`status-bar-fill ${crowdClass}`} 
              style={{ width: `${crowdPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          <button className="action-btn primary" onClick={() => alert('已进入预约通道')}>
            <UserCheck size={16} />
            立即预约
          </button>
          <button className="action-btn secondary" onClick={() => alert('咨询电话: 0731-8887XXXX')}>
            <Phone size={16} />
            电话咨询
          </button>
        </div>
      </div>
    </section>
  );
}


