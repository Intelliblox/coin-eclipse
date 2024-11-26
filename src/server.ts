import express from 'express';
import { Server } from 'ws';

const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const wss = new Server({ server });

wss.on('connection', (ws) => {
  const player: Player = {
    id: generateUniqueId(),
    coins: 100,
    bet: 0,
    multiplier: 0,
  };

  gameState.players.push(player);

  ws.send(JSON.stringify({ type: 'welcome', player }));

  ws.on('message', (message) => {
    const data = JSON.parse(message.toString());

    if (data.type === 'bet') {
      player.bet = data.bet;
      player.multiplier = data.multiplier;
    }
  });

  ws.on('close', () => {
    gameState.players = gameState.players.filter((p) => p.id !== player.id);
  });
});

const generateUniqueId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

interface Player {
  id: string;
  coins: number;
  bet: number;
  multiplier: number;
}

interface GameState {
  players: Player[];
  currentMultiplier: number;
  gameInProgress: boolean;
}

const gameState: GameState = {
  players: [],
  currentMultiplier: 1,
  gameInProgress: false,
};

const startGame = () => {
  gameState.gameInProgress = true;
  gameState.currentMultiplier = 1;

  const interval = setInterval(() => {
    gameState.currentMultiplier += Math.random(); // Randomly increase the multiplier

    // Notify all clients of the new multiplier
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ type: 'multiplier', value: gameState.currentMultiplier }));
    });

    // End the game after a certain condition
    if (gameState.currentMultiplier > 10) {
      clearInterval(interval);
      endGame();
    }
  }, 1000);
};

const endGame = () => {
  gameState.gameInProgress = false;

  // Calculate results for each player
  gameState.players.forEach((player) => {
    if (player.multiplier <= gameState.currentMultiplier) {
      player.coins += player.bet * player.multiplier;
    } else {
      player.coins -= player.bet;
    }
  });

  // Notify all clients of the game end and results
  wss.clients.forEach((client) => {
    client.send(JSON.stringify({ type: 'gameEnd', players: gameState.players }));
  });

  // Reset game state
  gameState.players = [];
  gameState.currentMultiplier = 1;
};