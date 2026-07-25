import { useLocation } from 'react-router-dom';

const darkModeRoutes: string[] = []; // Add routes as needed


function useDarkMode() {
  const location = useLocation();
  return darkModeRoutes.includes(location.pathname);
}

export default useDarkMode;