import React, { useState, useEffect } from 'react';

const SeveranceTextCountdown = () => {
  const [countdown, setCountdown] = useState(900); // 5 minutes in seconds
  const [activeDot, setActiveDot] = useState(0);
  const [textPhase, setTextPhase] = useState(0);
  
  // Severance-inspired corporate phrases
  const corporatePhrases = [
    "THANK YOU FOR YOUR PATIENCE",
    "YOUR STREAM EXPERIENCE AWAITS",
    "PLEASE MAINTAIN VIEWING PROTOCOL",
    "CONTENT DELIVERY IMMINENT",
    "SEVERANCE PROCEDURE APPROVED",
    "MACRODATA REFINEMENT COMPLETE",
    "YOUR COMPLIANCE IS APPRECIATED",
    "LUMON VALUES YOUR DEDICATION",
    "REMEMBER YOUR HANDBOOK PROTOCOL",
    "AUTHORIZED VIEWING AREA ONLY"
  ];
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
      
      // Change active dot pattern
      setActiveDot(prev => (prev + 1) % 100);
      
      // Change text phase every 8 seconds
      if (countdown % 8 === 0) {
        setTextPhase(prev => (prev + 1) % corporatePhrases.length);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);
  
  // Format time as mm:ss
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Generate dot grid with fewer dots for better performance
  const renderDotGrid = () => {
    const grid = [];
    const rows = 15;
    const cols = 20;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const dotIndex = i * cols + j;
        const isActiveDotRow = Math.floor(activeDot / cols) === i;
        const isActiveDotCol = activeDot % cols === j;
        
        const isSpecialDot = isActiveDotRow || isActiveDotCol;
                             
        grid.push(
          <div 
            key={dotIndex}
            className="absolute w-1 h-1 rounded-full transition-all duration-700 ease-in-out"
            style={{
              left: `${(j / cols) * 100}%`,
              top: `${(i / rows) * 100}%`,
              backgroundColor: isSpecialDot ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.1)',
              transform: isSpecialDot ? 'scale(1.2)' : 'scale(1)'
            }}
          />
        );
      }
    }
    
    return grid;
  };

  // Generate scrolling corporate text similar to credits
  const renderScrollingText = () => {
    const phrases = [
      "MDR DEPARTMENT",
      "MACRODATA REFINEMENT",
      "O&D DEPARTMENT",
      "YOUR OUTIE AWAITS", 
      "WELLNESS SESSION SCHEDULED",
      "REVOLVING",
      "PERPETUITY",
      "HARMONY", 
      "CALIBRATION"
    ];
    
    return phrases.map((phrase, index) => (
      <div 
        key={`scroll-${index}`}
        className="absolute left-0 font-mono text-xs tracking-widest text-gray-700 whitespace-nowrap"
        style={{
          top: `${((index * 150) + countdown) % 1000}px`,
          opacity: 0.3,
          transform: index % 2 === 0 ? 'translateX(-20px)' : 'translateX(20px)'
        }}
      >
        {phrase}
      </div>
    ));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white overflow-hidden">
      {/* Dot grid background */}
      <div className="fixed inset-0 opacity-40">
        {renderDotGrid()}
      </div>
      
      {/* Background scrolling text */}
      <div className="fixed inset-0 overflow-hidden opacity-20">
        {renderScrollingText()}
      </div>
      
      {/* Central container */}
      <div className="relative z-10 w-full max-w-md p-8">
        {/* Minimal Severance-inspired logo */}
        <div className="flex justify-center mb-12">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border border-white rounded-full opacity-80"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-px bg-white transform rotate-45 opacity-80"></div>
              <div className="w-8 h-px bg-white transform -rotate-45 opacity-80"></div>
            </div>
          </div>
        </div>
        
        {/* Severance-style department indicator */}
        <div className="mb-8 text-center">
          <div className="inline-block px-4 py-1 border border-gray-700">
            <span className="font-mono text-xs tracking-widest text-gray-400">BROADCAST DEPARTMENT</span>
          </div>
        </div>
        
        {/* Main countdown */}
        <div className="mb-10">
          <div className="font-mono text-center tracking-widest text-xs mb-8 text-gray-400">
            STREAM BEGINS IN
          </div>
          
          <div className="font-mono text-6xl tracking-widest text-center">
            {formattedTime.split('').map((char, i) => (
              <span key={i} className={`inline-block transition-all duration-300 ${i === 2 ? 'text-gray-600 mx-1' : 'text-white'}`}>
                {char}
              </span>
            ))}
          </div>
        </div>
        
        {/* Multiple severance-style text blocks */}
        <div className="space-y-6 mb-10">
          <div className="w-full h-px bg-gray-800"></div>
          
          <div className="font-mono text-xs tracking-widest text-center text-gray-400">
            VIEWING PROTOCOL {Math.floor(Math.random() * 900) + 100}-{Math.floor(Math.random() * 900) + 100}
          </div>
          
          <div className="w-full h-px bg-gray-800"></div>
          
          <div className="font-mono text-xs tracking-widest text-center text-white opacity-80 transition-all duration-1000">
            {corporatePhrases[textPhase]}
          </div>
          
          <div className="w-full h-px bg-gray-800"></div>
        </div>
        
        {/* Severance manual style notice */}
        <div className="mb-8 p-3 border border-gray-800 text-center">
          <div className="font-mono text-xs tracking-widest text-gray-400">
            NOTICE TO VIEWERS: ANY ATTEMPT TO RECORD OR CAPTURE THIS STREAM IS
            STRICTLY PROHIBITED AND MAY RESULT IN IMMEDIATE TERMINATION
          </div>
        </div>
        
        {/* Minimal progress bar */}
        <div className="w-full h-px bg-gray-800 relative mb-6">
          <div 
            className="absolute top-0 left-0 h-full bg-white transition-all duration-1000"
            style={{ width: `${(1 - countdown/300) * 100}%` }}
          ></div>
        </div>
        
        {/* Footer with version code */}
        <div className="text-center">
          <div className="font-mono text-xs tracking-widest text-gray-600">
            LUMON INDUSTRIES · VERSION {(Math.random() * 10).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeveranceTextCountdown;
