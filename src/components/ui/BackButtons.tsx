import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './button';

interface BackButtonsProps {
  spId?: string;
  showBackToHome?: boolean;
  showBackToSP?: boolean;
  className?: string;
}

export const BackButtons: React.FC<BackButtonsProps> = ({ 
  spId, 
  showBackToHome = true, 
  showBackToSP = true,
  className = '' 
}) => {
  const navigate = useNavigate();

  return (
    <div className={`flex gap-2 ${className}`}>
      {showBackToHome && (
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      )}
      {showBackToSP && spId && (
        <Button variant="outline" onClick={() => navigate(`/sp/${spId}/initiate`)}>
          Back to SP
        </Button>
      )}
    </div>
  );
}; 