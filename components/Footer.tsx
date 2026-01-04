
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-brand-dark text-gray-300 py-6 text-center">
      <div className="container mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} PitchHub. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
