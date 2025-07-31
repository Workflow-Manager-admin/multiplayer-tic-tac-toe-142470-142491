import { component$, useSignal, useTask$, $, useStyles$ } from "@builder.io/qwik";
import { AuthPanel } from "../components/AuthPanel";
import { api } from "../components/api";
import tictactoeStyles from "./tictactoe.css?inline";

export default component$(() => {
  useStyles$(tictactoeStyles);

  // State signals
  const user = useSignal<any>(null);
  const gameId = useSignal<number | null>(null);
  const game = useSignal<any>(null);
  const isLoading = useSignal(false);
  const errorMsg = useSignal("");
  const joinGameId = useSignal("");
  const waitingOpponent = useSignal(false);

  // Fetch polling for real-time updates
  useTask$(({ track, cleanup }) => {
    track(() => gameId.value);
    let interval: any = null;
    if (gameId.value) {
      const poll = async () => {
        try {
          const data = await api.getGame(Number(gameId.value));
          game.value = data;
        } catch (e: any) {
          // ignore errors (maybe game deleted, backend down etc.)
        }
      };
      poll(); // initial
      interval = setInterval(poll, 1700);
    }
    cleanup(() => {
      if (interval) clearInterval(interval);
    });
  });

  // Qwik-friendly user state update: pass a signal to AuthPanel that updates user signal
  const setUserSignal = useSignal<(u: any) => void>(() => {
    user.value = null;
    gameId.value = null;
    game.value = null;
  });
  setUserSignal.value = (u: any) => {
    user.value = u;
    if (!u) {
      gameId.value = null;
      game.value = null;
    }
  };

  // Create new game
  const handleCreateGame = $(async () => {
    errorMsg.value = "";
    isLoading.value = true;
    try {
      const data = await api.createGame();
      gameId.value = data.game_id;
      waitingOpponent.value = true;
    } catch (e: any) {
      errorMsg.value = e.message || "Failed to create game";
    }
    isLoading.value = false;
  });

  // Join existing game
  const handleJoinGame = $(async () => {
    errorMsg.value = "";
    if (!joinGameId.value || isNaN(Number(joinGameId.value))) {
      errorMsg.value = "Enter valid Game ID";
      return;
    }
    isLoading.value = true;
    try {
      const data = await api.joinGame(Number(joinGameId.value));
      gameId.value = data.game_id;
      waitingOpponent.value = false;
    } catch (e: any) {
      errorMsg.value = e.message || "Failed to join game";
    }
    isLoading.value = false;
  });

  // Make a move
  const handleMove = $(async (i: number, j: number) => {
    if (!game.value || !user.value) return;
    if (game.value.state !== "ongoing") return;
    if (game.value.board[i][j]) return;
    if (game.value.current_player !== user.value.username) return;

    try {
      await api.makeMove(gameId.value!, i, j);
      // Next fetch will refresh
    } catch (e: any) {
      errorMsg.value = e.message || "Failed to move";
    }
  });

  // Status helpers
  const getBanner = () => {
    if (!game.value) return null;
    if (game.value.state === "win") {
      return (
        <div class="status-banner" style={`background: var(--accent); color: var(--background);`}>
          {game.value.winner === user.value?.username
            ? "Congratulations! You won 🏆"
            : `Player ${game.value.winner} wins!`}
        </div>
      );
    }
    if (game.value.state === "tie") {
      return (
        <div class="status-banner" style="background: #494b53;">
          It's a tie game 🤝
        </div>
      );
    }
    if (game.value.state === "ongoing") {
      if (
        game.value.players &&
        game.value.players.length === 1 &&
        game.value.players[0] === user.value?.username
      ) {
        return (
          <div class="status-banner">
            Waiting for opponent to join&hellip;
          </div>
        );
      }
      return (
        <div class="status-banner" style="background: var(--primary)">
          {user.value &&
          game.value.current_player === user.value.username
            ? "Your turn!"
            : `Waiting for ${game.value.current_player}'s move...`}
        </div>
      );
    }
    return null;
  };

  // Board render
  const renderBoard = () => {
    if (!game.value) return null;
    return (
      <div class="game-board" aria-label="Tic Tac Toe Game Board">
        {game.value.board.map((row: string[], i: number) =>
          row.map((cell: string, j: number) => (
            <button
              key={i * 3 + j}
              class={`cell-btn ${cell === "X" ? "cell-x" : cell === "O" ? "cell-o" : ""}`}
              disabled={
                !!cell ||
                !user.value ||
                game.value.state !== "ongoing" ||
                game.value.current_player !== user.value.username
              }
              onClick$={() => handleMove(i, j)}
              aria-label={`${cell || "empty"} cell at ${i + 1},${j + 1}`}
            >
              {cell}
            </button>
          ))
        )}
      </div>
    );
  };

  return (
    <div id="tictactoe-app-root">
      <div class="header">Tic Tac Toe Multiplayer</div>
      <div class="main-area">
        <AuthPanel userSignal={user} setUserSignal={setUserSignal} />
        {!user.value && (
          <div style="text-align:center;color:var(--accent)">
            Sign in to start or join a game.
          </div>
        )}
        {user.value && !gameId.value && (
          <>
            <div class="control-panel">
              <button
                class="game-btn"
                disabled={isLoading.value}
                onClick$={handleCreateGame}
              >
                New Game
              </button>
              <input
                class="auth-input"
                style="max-width:104px"
                placeholder="Game ID"
                value={joinGameId.value}
                maxLength={8}
                onInput$={e =>
                  (joinGameId.value = (e.target as HTMLInputElement).value)
                }
              />
              <button
                class="game-btn"
                disabled={isLoading.value}
                onClick$={handleJoinGame}
              >
                Join Game
              </button>
            </div>
            <div style="margin-bottom:.8em;text-align:center;color:#ccc;font-size:.97em;">
              Or enter a Game ID shared by a friend
            </div>
          </>
        )}
        {user.value && gameId.value && (
          <div>
            <div class="game-id-info">
              Game ID:<strong> {gameId.value}</strong>
            </div>
            <div class="players-row" style="margin: 6px 0 2px 0;">
              {game.value?.players?.length
                ? "Players: " +
                  game.value.players
                    .map(
                      (pl: string) =>
                        (pl === user.value.username ? pl + " (You)" : pl)
                    )
                    .join(", ")
                : ""}
            </div>
            <div class="turn-row">
              {game.value && game.value.current_player && (
                <>
                  Turn:{" "}
                  <span style="color: var(--accent); font-weight: 600;">
                    {game.value.current_player}
                  </span>
                </>
              )}
            </div>
            {getBanner()}
            <div style="margin-top: 1rem"></div>
            {renderBoard()}
            <div class="control-panel">
              <button
                class="game-btn"
                style="background: #27282f; color: var(--accent); font-weight:500;"
                onClick$={() => {
                  gameId.value = null;
                  game.value = null;
                }}
              >
                Leave Game
              </button>
            </div>
          </div>
        )}

        {errorMsg.value && (
          <div
            style="
              color: #ff6868;
              background: #232526;
              border-radius: 7px;
              padding: 0.7em 1em;
              margin: .7em 0;
              text-align: center;
            "
          >
            {errorMsg.value}
          </div>
        )}

        {/* Stats/History panel (stub) */}
        <div class="stats-history">
          <span class="stats-title">Session & Game Info</span>
          <div>
            User:{" "}
            <span style="color:var(--accent);font-weight:600;">
              {user.value?.username || "None"}
            </span>
          </div>
          <div>
            Game:{" "}
            <span style="color:var(--primary)">
              {gameId.value || "-"}
            </span>
            {game.value?.state && (
              <>
                {" "}
                | Status:{" "}
                <span style="font-weight:600;color:#9aa">
                  {game.value.state}
                </span>
              </>
            )}
          </div>
          {/* For demo, stats could show more, e.g., win/loss count, move list, soon */}
        </div>
      </div>
    </div>
  );
});

// PUBLIC_INTERFACE
export const head = {
  title: "Tic Tac Toe Multiplayer",
  meta: [
    {
      name: "description",
      content: "Multiplayer Tic Tac Toe - play with friends, modern dark responsive UI"
    },
  ],
};
