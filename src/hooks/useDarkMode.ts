import { useLocation } from 'react-router-dom';

const darkModeRoutes = ['/about']; // Add other routes as needed


function useDarkMode() {
  const location = useLocation();
  return darkModeRoutes.includes(location.pathname);
}

export default useDarkMode;