
import React, { useState } from 'react';
import { THEMES } from '../constants';
import { ThemeConfig, ThemeId, Character } from '../types';
import packageJson from '../package.json';
import AvatarUpload from './AvatarUpload';

interface MainMenuProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
  onStartElimination: () => void;
  currentTheme: ThemeConfig;
  onSelectTheme: (themeId: ThemeId) => void;
  highScore: number;
  lifetimePoints: number; // Total cumulative points across all games
  selectedCharacterId: string;
  onSelectCharacter: (charId: string) => void;
  allCharacters: Character[]; // All available characters (default + community)
  onRefreshAvatars: () => void; // Refresh community avatars after upload
}

// Helper component to handle image loading errors gracefully
const CharacterAvatar: React.FC<{ char: Character; size?: string; className?: string }> = ({ 
  char, 
  size = "w-16 h-16",
  className = ""
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !char.avatarUrl) {
    return (
      <div 
        className={`${size} rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-white/20 ${className}`}
        style={{ backgroundColor: char.color, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      >
        <span className="text-lg font-display tracking-widest">{char.name.substring(0, 2)}</span>
      </div>
    );
  }

  return (
    <img 
      src={char.avatarUrl} 
      alt={char.name}
      onError={() => setImageError(true)}
      className={`${size} rounded-full object-cover shadow-lg border-2 border-white/20 bg-slate-800 ${className}`}
    />
  );
};

const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  onShowLeaderboard,
  onStartElimination,
  currentTheme,
  onSelectTheme,
  highScore,
  lifetimePoints,
  selectedCharacterId,
  onSelectCharacter,
  allCharacters,
  onRefreshAvatars
}) => {
  const themesList = Object.values(THEMES);
  const [activeIndex, setActiveIndex] = useState(themesList.findIndex(t => t.id === currentTheme.id));
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);

  const handlePrev = () => {
    const next = activeIndex === 0 ? themesList.length - 1 : activeIndex - 1;
    setActiveIndex(next);
    onSelectTheme(themesList[next].id);
  };

  const handleNext = () => {
    const next = activeIndex === themesList.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(next);
    onSelectTheme(themesList[next].id);
  };

  const activeTheme = themesList[activeIndex];
  const isLocked = highScore < activeTheme.unlockScore;

  // Check if all default characters are unlocked (community avatars are always unlocked)
  const defaultCharacters = allCharacters.filter(c => !c.id.startsWith('community-'));
  const allUnlocked = defaultCharacters.every(char => lifetimePoints >= char.unlockPoints);

  const renderCharacterSelect = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 p-3 animate-fade-in overflow-hidden">
       <div className="w-full max-w-5xl flex flex-col" style={{maxHeight: 'calc(100vh - 2rem)'}}>
         <div className="flex justify-between items-center mb-3 shrink-0">
            <h2 className="text-2xl font-bold text-white font-display tracking-wider">SELECT DRIVER</h2>
            <div className="text-right flex gap-4">
              <div>
                <p className="text-[10px] text-slate-400">HIGH SCORE</p>
                <p className="text-base font-mono text-cyan-400">{highScore.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">LIFETIME PTS</p>
                <p className="text-base font-mono text-purple-400">{lifetimePoints.toLocaleString()}</p>
              </div>
            </div>
         </div>

         {allUnlocked && (
           <div className="mb-2 p-3 bg-gradient-to-r from-purple-900/40 to-cyan-900/40 border border-purple-500/50 rounded-lg shrink-0">
             <div className="flex items-center gap-2">
               <span className="text-2xl">🏆</span>
               <div className="flex-1">
                 <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">All Drivers Unlocked!</p>
               </div>
               <button
                 onClick={() => {
                   const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just unlocked all 22 drivers in Automation Racer! 🏎️💨 Can you beat my ${lifetimePoints.toLocaleString()} lifetime points?`)}`;
                   window.open(shareUrl, '_blank');
                 }}
                 className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors text-xs"
               >
                 Share 🎉
               </button>
             </div>
           </div>
         )}

         <div className="flex-1 min-h-0 mb-3">
           <div className="grid grid-cols-5 lg:grid-cols-6 gap-3 h-full content-start">
              {allCharacters.map((char) => {
                const charLocked = lifetimePoints < char.unlockPoints;
                const isSelected = selectedCharacterId === char.id;
                const isCommunity = char.id.startsWith('community-');
                return (
                  <button
                    key={char.id}
                    disabled={charLocked}
                    onClick={() => onSelectCharacter(char.id)}
                    className={`relative group flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-900/20 shadow-[0_0_15px_rgba(34,211,238,0.3)] z-10'
                        : charLocked
                          ? 'border-slate-800 bg-slate-900/50 opacity-60'
                          : 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    <CharacterAvatar char={char} size="w-16 h-16" className="mb-2 transition-transform group-hover:scale-105" />

                    <span className={`text-[9px] font-bold font-mono truncate w-full text-center transition-colors ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {isCommunity && '🌐 '}{char.name}
                    </span>

                    {charLocked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl backdrop-blur-[2px]">
                        <span className="text-lg mb-1 drop-shadow-md">🔒</span>
                        <span className="text-[10px] text-white font-bold bg-red-500/80 px-1.5 py-0.5 rounded font-mono shadow-sm">
                          {char.unlockPoints >= 1000 ? `${char.unlockPoints/1000}k` : char.unlockPoints}
                        </span>
                      </div>
                    )}

                    {/* Selection Ring Animation */}
                    {isSelected && (
                      <div className="absolute inset-0 border-2 border-cyan-400 rounded-xl animate-pulse opacity-50" />
                    )}
                  </button>
                );
              })}
           </div>
         </div>

         <div className="flex gap-3 shrink-0">
           <button
             onClick={() => {
               setShowCharacterSelect(false);
               setShowAvatarUpload(true);
             }}
             className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold font-display rounded-lg transition-all shadow-lg tracking-widest text-sm"
           >
             📤 UPLOAD AVATAR
           </button>
           <button
             onClick={() => setShowCharacterSelect(false)}
             className="flex-1 py-3 bg-white text-slate-900 font-bold font-display rounded-lg hover:bg-cyan-50 transition-colors shadow-lg tracking-widest text-sm"
           >
             CONFIRM
           </button>
         </div>
       </div>
    </div>
  );

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 overflow-y-auto custom-scrollbar">
      {showCharacterSelect && renderCharacterSelect()}

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <AvatarUpload
          onClose={() => setShowAvatarUpload(false)}
          onSuccess={() => {
            onRefreshAvatars();
            setShowAvatarUpload(false);
          }}
        />
      )}

      {/* Glass Background */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-[-1]" />

      {/* Version Badge - Top Right */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-20">
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-cyan-500/30 backdrop-blur-md shadow-lg hover:border-cyan-400/50 transition-all duration-300">
            <span className="text-[10px] text-cyan-400/60 font-mono tracking-wider uppercase">Version</span>
            <span className="text-sm text-cyan-300 font-mono font-bold tracking-wide">{packageJson.version}</span>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative px-4 py-2 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-purple-500/30 backdrop-blur-md shadow-lg hover:border-purple-400/50 transition-all duration-300">
            <span className="text-xs text-white/60 font-mono">by <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-bold">jack</span></span>
          </div>
        </div>
      </div>

      <h1 className={`text-4xl md:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-lg ${activeTheme.font} text-center select-none`}>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">AUTOMATION</span>
        <br/>RACER
      </h1>
      
      {/* Card */}
      <div className={`w-full max-w-sm p-6 rounded-2xl border backdrop-blur-md shadow-2xl mb-6 transition-colors duration-500 ${activeTheme.colors.uiBackground} ${activeTheme.colors.uiBorder}`}>
        
        {/* Theme Carousel */}
        <div className="flex items-center justify-between mb-6 select-none">
          <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white font-bold text-xl transition-colors active:scale-90 border-2 border-white/20 shadow-lg">
            ←
          </button>
          <div className="text-center">
             <h2 className={`text-xl font-bold uppercase tracking-widest ${activeTheme.colors.text}`}>{activeTheme.name}</h2>
             <div className="flex gap-1 justify-center mt-1">
               {themesList.map((t, i) => (
                 <div key={t.id} className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? 'bg-white' : 'bg-white/20'}`} />
               ))}
             </div>
          </div>
          <button onClick={handleNext} className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white font-bold text-xl transition-colors active:scale-90 border-2 border-white/20 shadow-lg">
            →
          </button>
        </div>
        
        <p className={`text-center text-sm mb-6 ${activeTheme.colors.text} opacity-80 min-h-[2.5em]`}>
          {activeTheme.description}
        </p>

        {/* Driver Selection Preview */}
        <div className="flex justify-center mb-6">
           <button 
            onClick={() => setShowCharacterSelect(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/30 hover:bg-black/50 border border-white/10 hover:border-cyan-500/50 transition-all w-full justify-between group"
           >
             <div className="flex items-center gap-4">
                <CharacterAvatar
                  char={allCharacters.find(c => c.id === selectedCharacterId) || allCharacters[0]}
                  size="w-12 h-12"
                />
                <div className="text-left">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Current Driver</div>
                  <div className={`text-base font-bold ${activeTheme.colors.text}`}>{allCharacters.find(c => c.id === selectedCharacterId)?.name}</div>
                </div>
             </div>
             <div className="text-white/50 text-xs group-hover:text-white transition-colors font-bold">CHANGE &gt;</div>
           </button>
        </div>

        {isLocked ? (
          <div className="w-full py-3 rounded-xl bg-black/30 border border-white/10 text-center mb-4">
             <span className="text-red-400 font-bold text-sm font-mono">🔒 UNLOCKS AT {activeTheme.unlockScore} PTS</span>
          </div>
        ) : (
          <button 
            onClick={onStart}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-lg shadow-lg shadow-blue-500/30 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            START ENGINE
          </button>
        )}
      </div>
      
      {/* Power Up Legend */}
      <div className="flex gap-8 mb-6 bg-slate-900/60 p-4 rounded-xl backdrop-blur-sm border border-white/5">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white mb-1 shadow-[0_0_15px_rgba(6,182,212,0.6)] flex items-center justify-center text-[10px] font-bold">S</div>
          <span className="text-[10px] uppercase font-bold text-cyan-200 tracking-wider">Shield</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-purple-500 border-2 border-white mb-1 shadow-[0_0_15px_rgba(168,85,247,0.6)] flex items-center justify-center text-[10px] font-bold">⏱</div>
          <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Slow Mo</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-orange-400 mb-1 shadow-[0_0_15px_rgba(239,68,68,0.6)] flex items-center justify-center text-[10px] font-bold">💥</div>
          <span className="text-[10px] uppercase font-bold text-red-200 tracking-wider">Blast</span>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <button
          onClick={onShowLeaderboard}
          className="px-6 py-3 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 text-white font-semibold text-sm transition-all backdrop-blur-md"
        >
          🏆 LEADERBOARD
        </button>
        <button
          onClick={onStartElimination}
          className="px-6 py-3 rounded-full bg-gradient-to-r from-red-600/80 to-purple-600/80 hover:from-red-500 hover:to-purple-500 border border-red-400/30 text-white font-bold text-sm transition-all backdrop-blur-md shadow-lg"
        >
          ⚔️ AI ELIMINATION
        </button>
        <div className="flex gap-4">
          <div className="px-6 py-3 rounded-full bg-white/5 text-white/50 text-sm font-mono border border-white/5">
            HIGH SCORE: {highScore.toLocaleString()}
          </div>
          <div className="px-6 py-3 rounded-full bg-purple-900/20 text-purple-300 text-sm font-mono border border-purple-500/20">
            💎 LIFETIME: {lifetimePoints.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-white/30 text-xs font-mono text-center">
        <div>↑↓ SWITCH LANES  •  ←→ DODGE  •  SPACE JUMP</div>
      </div>
    </div>
  );
};

export default MainMenu;
