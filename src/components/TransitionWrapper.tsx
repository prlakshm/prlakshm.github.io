import React, { ReactNode } from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { useLocation } from 'react-router-dom';

type TransitionWrapperProps = {
  children: ReactNode;
};

const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ children }) => {
  const location = useLocation();
  
  return (
    <SwitchTransition>
      <CSSTransition
        key={location.pathname}
        classNames="fade"
        timeout={500}
      >
        {children}
      </CSSTransition>
    </SwitchTransition>
  );
};

export default TransitionWrapper;
