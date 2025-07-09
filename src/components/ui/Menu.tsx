import { Button } from './button';
import { useNavigate } from 'react-router-dom';

const Menu: React.FC = () => {
  const navigate = useNavigate();
  return (
    <nav className="w-full bg-white border-b shadow-sm">
      <div className="max-w-2xl mx-auto px-4 flex h-14 items-center justify-between">
        <Button variant="link" className="text-lg font-bold p-0" onClick={() => navigate('/')}>SAML test</Button>
        <Button variant="link" className="p-0" onClick={() => navigate('/about')}>About</Button>
      </div>
    </nav>
  );
};

export default Menu; 