export function mountSnakeGame(
  container,
  { getMessages, createGuiButton, formatTemplate, isGuiMode } = {}
) {
    const messages = typeof getMessages === "function" ? getMessages() : {};
    const wrapper = container || document.createElement("div");
    wrapper.className = "snake-game";
    wrapper.innerHTML = "";
    wrapper.tabIndex = 0;

    const hint = document.createElement("div");
    hint.className = "snake-hint";
    hint.textContent = messages.snakeHint;
    wrapper.append(hint);

    const controls = document.createElement("div");
    controls.className = "snake-controls";

    const startBtn = createGuiButton(messages.snakeStart, () => toggleRun());
    const restartBtn = createGuiButton(messages.snakeRestart, () => resetGame());
    controls.append(startBtn, restartBtn);
    wrapper.append(controls);

    const score = document.createElement("div");
    score.className = "snake-score";
    wrapper.append(score);

    const status = document.createElement("div");
    status.className = "snake-status";
    wrapper.append(status);

    const canvas = document.createElement("canvas");
    canvas.className = "snake-canvas";
    const gridSize = 16;
    const cellSize = 16;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;
    wrapper.append(canvas);

    const ctx = canvas.getContext("2d");
    let snake = [];
    let direction = { x: 1, y: 0 };
    let pendingDirection = { x: 1, y: 0 };
    let food = null;
    let scoreValue = 0;
    let running = false;
    let intervalId = null;
    let gameOver = false;
    let touchStart = null;
    let touchMoved = false;
    const SWIPE_THRESHOLD = 14;

    function formatLine(template, vars = {}) {
      if (typeof formatTemplate === "function") {
        return formatTemplate(template, vars);
      }
      return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
    }

    function updateScore() {
      score.textContent = formatLine(messages.snakeScore || "Score: {{score}}", { score: scoreValue });
    }

    function setStatus(text) {
      status.textContent = text;
    }

    function buildInitialSnake() {
      return [
        { x: 8, y: 8 },
        { x: 7, y: 8 },
        { x: 6, y: 8 }
      ];
    }

    function spawnFood() {
      let candidate = null;
      let attempts = 0;
      do {
        candidate = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize)
        };
        attempts += 1;
      } while (snake.some((segment) => segment.x === candidate.x && segment.y === candidate.y) && attempts < 200);
      return candidate;
    }

    function resetGame() {
      stopRun();
      snake = buildInitialSnake();
      direction = { x: 1, y: 0 };
      pendingDirection = { x: 1, y: 0 };
      food = spawnFood();
      scoreValue = 0;
      gameOver = false;
      updateScore();
      setStatus("");
      render();
      updateStartLabel();
    }

    function updateStartLabel() {
      if (gameOver) {
        startBtn.textContent = messages.snakeStart;
        return;
      }
      startBtn.textContent = running ? messages.snakePause : messages.snakeStart;
    }

    function stopRun() {
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      updateStartLabel();
    }

    function startRun() {
      if (gameOver) {
        resetGame();
      }
      running = true;
      updateStartLabel();
      setStatus("");
      intervalId = setInterval(step, 140);
    }

    function toggleRun() {
      if (running) {
        stopRun();
        return;
      }
      startRun();
    }

    function step() {
      direction = pendingDirection;
      const head = { ...snake[0] };
      head.x += direction.x;
      head.y += direction.y;

      if (head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize) {
        endGame();
        return;
      }
      if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
      }

      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        scoreValue += 1;
        food = spawnFood();
        updateScore();
      } else {
        snake.pop();
      }
      render();
    }

    function endGame() {
      gameOver = true;
      stopRun();
      setStatus(messages.snakeGameOver);
    }

    function renderGrid() {
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#d0d0d0";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i += 1) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
      }
    }

    function render() {
      renderGrid();
      ctx.fillStyle = "#1f7a1f";
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#0c5a0c" : "#1f7a1f";
        ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
      });
      if (food) {
        ctx.fillStyle = "#b33a3a";
        ctx.fillRect(food.x * cellSize + 2, food.y * cellSize + 2, cellSize - 4, cellSize - 4);
      }
    }

    function handleKey(event) {
      if (typeof isGuiMode === "function" && !isGuiMode()) return;
      if (!wrapper.contains(document.activeElement)) return;
      const key = event.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        event.preventDefault();
        toggleRun();
        return;
      }
      const next = {
        arrowup: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 },
        d: { x: 1, y: 0 }
      }[key];
      if (!next) return;
      event.preventDefault();
      if (next.x === -direction.x && next.y === -direction.y) return;
      pendingDirection = next;
    }

    function handleTouchStart(event) {
      if (typeof isGuiMode === "function" && !isGuiMode()) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
      touchMoved = false;
    }

    function handleTouchMove(event) {
      if (!touchStart) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
      event.preventDefault();
      touchMoved = true;
      if (Math.abs(dx) > Math.abs(dy)) {
        const next = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
        if (!(next.x === -direction.x && next.y === -direction.y)) {
          pendingDirection = next;
        }
      } else {
        const next = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
        if (!(next.x === -direction.x && next.y === -direction.y)) {
          pendingDirection = next;
        }
      }
      touchStart = null;
    }

    function handleTouchEnd() {
      if (!touchStart) return;
      if (!touchMoved) {
        toggleRun();
      }
      touchStart = null;
    }

    wrapper.addEventListener("pointerdown", () => wrapper.focus({ preventScroll: true }));
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKey);

    resetGame();

    wrapper.__cleanup = () => {
      clearInterval(intervalId);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
    wrapper.__focus = () => wrapper.focus({ preventScroll: true });

    return wrapper;
  }

