
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, LeaderboardEntry, ThemeConfig, ThemeId, Character } from './types';
import { THEMES, LEVEL_SCORE_THRESHOLD, CHARACTERS, convertCommunityAvatarToCharacter } from './constants';
import { fetchCommunityAvatars } from './lib/supabase';
import { Track } from './lib/tracks';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import GameOver from './components/GameOver';
import Leaderboard from './components/Leaderboard';
import AIEliminationGame from './components/AIEliminationGame';
import DriftAttackGame from './components/DriftAttackGame';
import TrackSelection from './components/TrackSelection';
import GameModeSelection from './components/GameModeSelection';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MODE_SELECTION);
  const [score, setScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>('midnight');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('player1');
  const [highScore, setHighScore] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0); // Total cumulative points earned across all games
  const [eliminationWins, setEliminationWins] = useState(0); // Wins in AI Elimination mode
  const [communityAvatars, setCommunityAvatars] = useState<Character[]>([]); // User-uploaded community avatars
  const [allCharacters, setAllCharacters] = useState<Character[]>(CHARACTERS); // Default + community merged
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null); // For Drift Attack mode

  // Load community avatars and merge with defaults
  const loadCommunityAvatars = useCallback(async () => {
    try {
      const dbRecords = await fetchCommunityAvatars();
      const communityChars = dbRecords.map(convertCommunityAvatarToCharacter);
      setCommunityAvatars(communityChars);
      // Merge: default characters first, then community avatars
      setAllCharacters([...CHARACTERS, ...communityChars]);
    } catch (error) {
      console.error('Failed to load community avatars:', error);
      // On error, just use default characters
      setAllCharacters(CHARACTERS);
    }
  }, []);

  // Load Data
  useEffect(() => {
    const storedScores = localStorage.getItem('neon_runner_scores');
    if (storedScores) {
      try {
        const parsed = JSON.parse(storedScores);
        setLeaderboard(parsed);
        // Calculate high score from stored data
        if (parsed.length > 0) {
          const max = Math.max(...parsed.map((e: LeaderboardEntry) => e.score));
          setHighScore(max);
        }
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    } else {
      const defaults: LeaderboardEntry[] = [
        { name: 'CPU', score: 15000, date: new Date().toISOString(), rankTitle: 'The Architect', aiComment: 'I literally designed this game.' },
        { name: 'BOT', score: 8000, date: new Date().toISOString(), rankTitle: 'Speed Demon', aiComment: 'Beep boop, too fast for you.' },
      ];
      setLeaderboard(defaults);
      localStorage.setItem('neon_runner_scores', JSON.stringify(defaults));
      setHighScore(15000);
    }

    // Load lifetime points
    const storedLifetimePoints = localStorage.getItem('neon_runner_lifetime_points');
    if (storedLifetimePoints) {
      try {
        const parsed = parseInt(storedLifetimePoints, 10);
        setLifetimePoints(parsed);
      } catch (e) {
        console.error("Failed to parse lifetime points", e);
      }
    }

    // Load elimination wins
    const storedEliminationWins = localStorage.getItem('neon_runner_elimination_wins');
    if (storedEliminationWins) {
      try {
        const parsed = parseInt(storedEliminationWins, 10);
        setEliminationWins(parsed);
      } catch (e) {
        console.error("Failed to parse elimination wins", e);
      }
    }

    // Load community avatars
    loadCommunityAvatars();
  }, [loadCommunityAvatars]);

  const startGame = () => {
    setScore(0);
    setGameState(GameState.PLAYING);
  };

  // MEMOIZED CALLBACKS TO PREVENT GAME RESET
  const handleGameOver = useCallback((finalScore: number, time: number) => {
    setScore(finalScore);
    setFinalTime(time);
    setGameState(GameState.GAME_OVER);
    if (finalScore > highScore) {
      setHighScore(finalScore);
    }
  }, [highScore]);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const handleLevelUpdate = useCallback((newLevel: number) => {
    setLevel(newLevel);
  }, []);

  const handleLifetimePointsUpdate = useCallback((gameScore: number) => {
    const newTotal = lifetimePoints + gameScore;
    setLifetimePoints(newTotal);
    localStorage.setItem('neon_runner_lifetime_points', newTotal.toString());
  }, [lifetimePoints]);

  const submitScore = (entry: LeaderboardEntry) => {
    const newLeaderboard = [...leaderboard, entry].sort((a, b) => b.score - a.score);
    setLeaderboard(newLeaderboard);
    localStorage.setItem('neon_runner_scores', JSON.stringify(newLeaderboard));
    setTimeout(() => setGameState(GameState.LEADERBOARD), 500);
  };

  const startElimination = () => {
    setGameState(GameState.AI_ELIMINATION);
  };

  const handleEliminationWin = () => {
    const newWins = eliminationWins + 1;
    setEliminationWins(newWins);
    localStorage.setItem('neon_runner_elimination_wins', newWins.toString());
  };

  const startDriftAttack = () => {
    setGameState(GameState.DRIFT_TRACK_SELECT);
  };

  const handleTrackSelect = (track: Track) => {
    setSelectedTrack(track);
    setGameState(GameState.DRIFT_ATTACK);
  };

  const currentTheme = THEMES[currentThemeId];
  const selectedCharacter = allCharacters.find(c => c.id === selectedCharacterId) || allCharacters[0];

  // Calculate progress to next level
  const scoreInCurrentLevel = score - ((level - 1) * LEVEL_SCORE_THRESHOLD);
  const progressPercent = Math.min(100, Math.max(0, (scoreInCurrentLevel / LEVEL_SCORE_THRESHOLD) * 100));

  return (
    <div className={`relative w-full h-screen flex justify-center overflow-hidden ${currentTheme.font}`}
      style={{ backgroundColor: currentTheme.colors.backgroundTop }}
    >
      {/* HUD Overlay (Only show during game) */}
      {gameState === GameState.PLAYING && (
        <div className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between pointer-events-none max-w-2xl left-1/2 -translate-x-1/2">
          <div className="text-left">
            <p className={`text-xs font-bold tracking-widest ${currentTheme.colors.text}`}>SCORE</p>
            <p className={`text-3xl font-mono ${currentTheme.colors.text}`} style={{ textShadow: `0 0 10px ${selectedCharacter.color}` }}>
              {score.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-400 font-bold tracking-widest">LEVEL {level}</p>
            <div className="flex items-center gap-2 justify-end mt-1">
               <div className="text-[10px] text-white/50">NEXT</div>
               <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                <div 
                  className="h-full transition-all duration-300 ease-out"
                  style={{ 
                    width: `${progressPercent}%`,
                    backgroundColor: selectedCharacter.color
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <GameCanvas
        gameState={gameState}
        theme={currentTheme}
        character={selectedCharacter}
        onGameOver={handleGameOver}
        onScoreUpdate={handleScoreUpdate}
        onLevelUpdate={handleLevelUpdate}
        onLifetimePointsUpdate={handleLifetimePointsUpdate}
      />

      {gameState === GameState.MODE_SELECTION && (
        <GameModeSelection
          onSelectRacing={() => setGameState(GameState.MENU)}
          onSelectElimination={startElimination}
          onSelectDriftAttack={startDriftAttack}
        />
      )}

      {gameState === GameState.MENU && (
        <MainMenu
          onStart={startGame}
          onShowLeaderboard={() => setGameState(GameState.LEADERBOARD)}
          onStartElimination={startElimination}
          currentTheme={currentTheme}
          onSelectTheme={setCurrentThemeId}
          highScore={highScore}
          lifetimePoints={lifetimePoints}
          selectedCharacterId={selectedCharacterId}
          onSelectCharacter={setSelectedCharacterId}
          allCharacters={allCharacters}
          onRefreshAvatars={loadCommunityAvatars}
        />
      )}

      {gameState === GameState.GAME_OVER && (
        <GameOver
          score={score}
          time={finalTime}
          onRetry={startGame}
          onMenu={() => setGameState(GameState.MODE_SELECTION)}
          onSubmitScore={submitScore}
        />
      )}

      {gameState === GameState.LEADERBOARD && (
        <Leaderboard
          scores={leaderboard}
          onBack={() => setGameState(GameState.MODE_SELECTION)}
        />
      )}

      {gameState === GameState.AI_ELIMINATION && (
        <AIEliminationGame
          onBack={() => setGameState(GameState.MODE_SELECTION)}
          onWin={handleEliminationWin}
          selectedCharacterId={selectedCharacterId}
          eliminationWins={eliminationWins}
          allCharacters={allCharacters}
          onRefreshAvatars={loadCommunityAvatars}
        />
      )}

      {gameState === GameState.DRIFT_TRACK_SELECT && (
        <TrackSelection
          onSelectTrack={handleTrackSelect}
          onBack={() => setGameState(GameState.MODE_SELECTION)}
          playerHighScore={lifetimePoints}
        />
      )}

      {gameState === GameState.DRIFT_ATTACK && selectedTrack && (
        <DriftAttackGame
          selectedTrack={selectedTrack}
          selectedCharacter={selectedCharacter}
          onBack={() => setGameState(GameState.DRIFT_TRACK_SELECT)}
          playerHighScore={lifetimePoints}
        />
      )}
    </div>
  );
};

export default App;
