import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './map.css';
import CampusMapApp from './CampusMapApp.jsx';

createRoot(document.getElementById('map-root')).render(<StrictMode><CampusMapApp /></StrictMode>);
