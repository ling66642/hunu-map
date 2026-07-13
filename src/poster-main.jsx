import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './poster.css';
import PosterApp from './PosterApp.jsx';

createRoot(document.getElementById('poster-root')).render(<StrictMode><PosterApp /></StrictMode>);
