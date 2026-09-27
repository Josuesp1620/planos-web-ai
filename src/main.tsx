import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Sin StrictMode: su doble montaje hace que drei <Html> pierda la primera etiqueta de cada escena.
createRoot(document.getElementById('root')!).render(<App />);
