import React from 'react';

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaButton?: string;
}

export const Hero: React.FC<HeroProps> = ({ title, subtitle, ctaButton }) => (
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6">
    <div className="container mx-auto max-w-4xl text-center">
      <h1 className="text-5xl font-bold mb-6">{title}</h1>
      {subtitle && <p className="text-xl mb-8 opacity-90">{subtitle}</p>}
      {ctaButton && (
        <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition">
          {ctaButton}
        </button>
      )}
    </div>
  </div>
);

