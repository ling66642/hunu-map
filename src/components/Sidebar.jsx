import React from 'react';
import { Search, MapPin, Compass } from 'lucide-react';

export default function Sidebar({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  venues,
  selectedVenue,
  setSelectedVenue
}) {
  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Compass size={20} />
          </div>
          <div className="brand-title">
            <h1>湖南师大体育设施</h1>
            <p>二里半校区 • 交互式导览地图</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="搜索场馆、健身房、球场..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={18} className="search-icon" />
        </div>
      </div>

      {/* Categories */}
      <div className="filter-container">
        <button
          className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          全部设施
        </button>
        <button
          className={`filter-btn ${activeCategory === 'sports' ? 'active' : ''}`}
          onClick={() => setActiveCategory('sports')}
        >
          体育场馆
        </button>
        <button
          className={`filter-btn ${activeCategory === 'gyms' ? 'active' : ''}`}
          onClick={() => setActiveCategory('gyms')}
        >
          健身房
        </button>
      </div>

      {/* Venue List */}
      <div className="venue-list">
        {venues.length > 0 ? (
          venues.map((venue) => {
            const isSports = venue.properties.category === 'sports';
            const isSelected = selectedVenue && selectedVenue.properties.id === venue.properties.id;
            const isInside = venue.properties.is_inside === 1 || venue.properties.is_inside === '1';
            const name = venue.properties.name || venue.properties.Name || "";
            const address = venue.properties.address || venue.properties.Address || "";
            
            return (
              <div
                key={venue.properties.id}
                className={`venue-card ${isSports ? 'type-sports' : 'type-gyms'} ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedVenue(venue)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 className="venue-name" style={{ flex: 1, margin: 0 }}>{name}</h3>
                  <span className={`venue-location-badge ${isInside ? 'inside' : 'outside'}`} style={{ flexShrink: 0 }}>
                    {isInside ? '校内' : '周边'}
                  </span>
                </div>
                <div className="venue-meta" style={{ marginTop: '8px' }}>
                  <span className={`venue-tag ${isSports ? 'sports' : 'gyms'}`}>
                    {isSports ? '体育设施' : '健身房'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} />
                    {address ? address.slice(0, 12) + (address.length > 12 ? '...' : '') : '校区内'}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            没有找到相关设施，请换个词试试
          </div>
        )}
      </div>
    </aside>
  );
}

