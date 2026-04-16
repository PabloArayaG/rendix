import { useState, useEffect } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Router } from './components/Router';
import { TourOverlay, TOUR_KEY } from './components/tutorial/TourOverlay';

function App() {
  const [showTour, setShowTour] = useState(false);

  /* Mostrar automáticamente la primera vez */
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY);
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  /* Escuchar el evento global del botón "Tutorial" */
  useEffect(() => {
    const handler = () => setShowTour(true);
    window.addEventListener('rendix:start-tour', handler);
    return () => window.removeEventListener('rendix:start-tour', handler);
  }, []);

  const handleCloseTour = () => {
    localStorage.setItem(TOUR_KEY, 'true');
    setShowTour(false);
  };

  return (
    <ProtectedRoute>
      <Router />
      {showTour && <TourOverlay onClose={handleCloseTour} />}
    </ProtectedRoute>
  );
}

export default App;
