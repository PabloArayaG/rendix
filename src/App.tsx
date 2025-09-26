import { ProtectedRoute } from './components/ProtectedRoute';
import { Router } from './components/Router';

function App() {
  return (
    <ProtectedRoute>
      <Router />
    </ProtectedRoute>
  );
}

export default App;
