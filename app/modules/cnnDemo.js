let tfReadyPromise = null;
let cnnModelPromise = null;

function loadTfjs() {
  if (window.tf && typeof window.tf.loadGraphModel === "function") {
    return Promise.resolve(window.tf);
  }
  if (tfReadyPromise) return tfReadyPromise;
  tfReadyPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
    script.async = true;
    script.onload = () => resolve(window.tf);
    script.onerror = () => reject(new Error("Failed to load TensorFlow.js"));
    document.head.append(script);
  });
  return tfReadyPromise;
}

async function ensureModel(setStatus, predictBtn, messages) {
  try {
    await loadTfjs();
  } catch (error) {
    setStatus(messages.cnnStatusNoTf || "TensorFlow.js not loaded.", true);
    if (predictBtn) predictBtn.disabled = true;
    return null;
  }

  if (!cnnModelPromise) {
    setStatus(messages.cnnStatusLoading || "Loading model...", false);
    cnnModelPromise = window.tf
      .loadGraphModel("./assets/web_model/model.json")
      .catch((error) => {
        cnnModelPromise = null;
        throw error;
      });
  }

  try {
    const model = await cnnModelPromise;
    setStatus(messages.cnnStatusReady || "Model ready.", false);
    if (predictBtn) predictBtn.disabled = false;
    return model;
  } catch (error) {
    setStatus(messages.cnnStatusError || "Failed to load model.", true);
    if (predictBtn) predictBtn.disabled = true;
    return null;
  }
}

export function mountCnnDemo(container, { getMessages, createGuiButton }) {
  const messages = getMessages();
  const wrapper = container || document.createElement("div");
  wrapper.className = "cnn-demo";
  wrapper.innerHTML = "";

  const header = document.createElement("div");
  header.className = "cnn-header";

  const hint = document.createElement("div");
  hint.className = "cnn-hint";
  hint.textContent = messages.cnnHint || "Draw a digit and click Predict.";

  const status = document.createElement("div");
  status.className = "cnn-status";
  status.textContent = messages.cnnStatusLoading || "Loading model...";

  header.append(hint, status);
  wrapper.append(header);

  const explain = document.createElement("div");
  explain.className = "cnn-explain";
  explain.textContent =
    messages.cnnExplain ||
    "Pipeline: training in Python, model export, and browser inference with consistent preprocessing.";
  wrapper.append(explain);

  const panel = document.createElement("div");
  panel.className = "cnn-panel";

  const drawCol = document.createElement("div");
  drawCol.className = "cnn-draw";

  const canvas = document.createElement("canvas");
  canvas.className = "cnn-canvas";
  canvas.width = 280;
  canvas.height = 280;

  const previewWrap = document.createElement("div");
  previewWrap.className = "cnn-preview-wrap";
  const previewLabel = document.createElement("div");
  previewLabel.textContent = messages.cnnPreviewLabel || "Preview 28x28";
  const preview = document.createElement("canvas");
  preview.className = "cnn-preview";
  preview.width = 28;
  preview.height = 28;
  previewWrap.append(previewLabel, preview);

  const controls = document.createElement("div");
  controls.className = "cnn-controls";
  const clearBtn = createGuiButton(messages.cnnClear || "Clear", () => resetCanvas());
  const predictBtn = createGuiButton(messages.cnnPredict || "Predict", () =>
    runPrediction({ silentEmpty: false })
  );
  predictBtn.disabled = true;
  controls.append(clearBtn, predictBtn);

  drawCol.append(canvas, previewWrap, controls);

  const results = document.createElement("div");
  results.className = "cnn-results";

  const resultTitle = document.createElement("div");
  resultTitle.className = "cnn-result-title";
  resultTitle.textContent = messages.cnnResultLabel || "Prediction";

  const resultValue = document.createElement("div");
  resultValue.className = "cnn-result-value";
  resultValue.textContent = "-";

  const latency = document.createElement("div");
  latency.className = "cnn-latency";
  latency.textContent = formatLatency(null);

  const probList = document.createElement("div");
  probList.className = "cnn-prob-list";
  const probRows = [];
  for (let i = 0; i < 10; i += 1) {
    const row = document.createElement("div");
    row.className = "cnn-prob-row";
    const label = document.createElement("div");
    label.textContent = String(i);
    const bar = document.createElement("div");
    bar.className = "cnn-prob-bar";
    const fill = document.createElement("div");
    fill.className = "cnn-prob-fill";
    bar.append(fill);
    const val = document.createElement("div");
    val.className = "cnn-prob-val";
    val.textContent = "0.0%";
    row.append(label, bar, val);
    probList.append(row);
    probRows.push({ row, fill, val });
  }

  results.append(resultTitle, resultValue, latency, probList);
  panel.append(drawCol, results);
  wrapper.append(panel);

  const ctx = canvas.getContext("2d");
  const previewCtx = preview.getContext("2d");
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#000000";
  previewCtx.imageSmoothingEnabled = true;

  const PREVIEW_SIZE = 28;
  const THRESHOLD = 0.2;
  let drawing = false;

  function setStatus(text, isError) {
    status.textContent = text;
    status.classList.toggle("cnn-error", Boolean(isError));
  }

  function formatLatency(ms) {
    const label = messages.cnnLatencyLabel || "Latency";
    if (typeof ms !== "number") return `${label}: --`;
    return `${label}: ${Math.round(ms)} ms`;
  }

  function resetProbs() {
    resultValue.textContent = "-";
    probRows.forEach(({ row, fill, val }) => {
      row.classList.remove("active");
      fill.style.width = "0%";
      val.textContent = "0.0%";
    });
    latency.textContent = formatLatency(null);
  }

  function resetCanvas() {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    updatePreview();
    resetProbs();
    if (!status.classList.contains("cnn-error")) {
      const readyLabel = messages.cnnStatusReady || "Model ready.";
      const loadingLabel = messages.cnnStatusLoading || "Loading model...";
      setStatus(predictBtn.disabled ? loadingLabel : readyLabel, false);
    }
  }

  function updatePreview() {
    previewCtx.clearRect(0, 0, preview.width, preview.height);
    previewCtx.drawImage(canvas, 0, 0, preview.width, preview.height);
  }

  function getCenteredInput() {
    updatePreview();
    const imageData = previewCtx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    const data = imageData.data;
    const binary = new Uint8Array(PREVIEW_SIZE * PREVIEW_SIZE);
    let minX = PREVIEW_SIZE;
    let minY = PREVIEW_SIZE;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < PREVIEW_SIZE; y += 1) {
      for (let x = 0; x < PREVIEW_SIZE; x += 1) {
        const idx = y * PREVIEW_SIZE + x;
        const value = data[idx * 4] / 255;
        if (value >= THRESHOLD) {
          binary[idx] = 1;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0) {
      return { empty: true, tensor: null };
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const offsetX = Math.floor((PREVIEW_SIZE - width) / 2) - minX;
    const offsetY = Math.floor((PREVIEW_SIZE - height) / 2) - minY;

    const centered = new Float32Array(PREVIEW_SIZE * PREVIEW_SIZE);
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const idx = y * PREVIEW_SIZE + x;
        if (!binary[idx]) continue;
        const nx = x + offsetX;
        const ny = y + offsetY;
        if (nx < 0 || ny < 0 || nx >= PREVIEW_SIZE || ny >= PREVIEW_SIZE) continue;
        centered[ny * PREVIEW_SIZE + nx] = 1;
      }
    }

    for (let i = 0; i < centered.length; i += 1) {
      const v = centered[i] > 0 ? 255 : 0;
      const base = i * 4;
      data[base] = v;
      data[base + 1] = v;
      data[base + 2] = v;
      data[base + 3] = 255;
    }
    previewCtx.putImageData(imageData, 0, 0);

    return {
      empty: false,
      tensor: window.tf.tensor4d(centered, [1, PREVIEW_SIZE, PREVIEW_SIZE, 1])
    };
  }

  function updateProbs(values) {
    const list = Array.from(values);
    let bestIndex = 0;
    let bestValue = list[0] || 0;
    list.forEach((value, index) => {
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    });
    resultValue.textContent = String(bestIndex);
    list.forEach((value, index) => {
      const pct = Math.max(0, Math.min(100, value * 100));
      const row = probRows[index];
      row.row.classList.toggle("active", index === bestIndex);
      row.fill.style.width = `${pct.toFixed(1)}%`;
      row.val.textContent = `${pct.toFixed(1)}%`;
    });
  }

  let predictScheduled = null;
  let predicting = false;
  let predictQueued = false;
  const LIVE_PREDICT_DELAY = 140;

  async function runPrediction(options = {}) {
    const model = await ensureModel(setStatus, predictBtn, messages);
    if (!model) return;
    const inputData = getCenteredInput();
    if (inputData.empty) {
      if (!options.silentEmpty) {
        setStatus(messages.cnnEmpty || "Draw something before predicting.", true);
      }
      return;
    }
    setStatus(messages.cnnStatusReady || "Model ready.", false);
    const input = inputData.tensor;
    const start = performance.now();
    let output = null;
    try {
      const prediction = model.predict(input);
      output = Array.isArray(prediction) ? prediction[0] : prediction;
      const data = await output.data();
      updateProbs(data);
    } finally {
      const end = performance.now();
      latency.textContent = formatLatency(end - start);
      input.dispose();
      if (output) output.dispose();
    }
  }

  function scheduleLivePrediction() {
    if (predicting) {
      predictQueued = true;
      return;
    }
    if (predictScheduled) return;
    predictScheduled = window.setTimeout(async () => {
      predictScheduled = null;
      predicting = true;
      await runPrediction({ silentEmpty: true });
      predicting = false;
      if (predictQueued) {
        predictQueued = false;
        scheduleLivePrediction();
      }
    }, LIVE_PREDICT_DELAY);
  }

  function getCanvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    drawing = true;
    const pos = getCanvasPos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    updatePreview();
    canvas.setPointerCapture(event.pointerId);
    scheduleLivePrediction();
  }

  function handlePointerMove(event) {
    if (!drawing) return;
    event.preventDefault();
    const pos = getCanvasPos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    updatePreview();
    scheduleLivePrediction();
  }

  function handlePointerUp(event) {
    if (!drawing) return;
    drawing = false;
    ctx.closePath();
    if (event.pointerId != null) {
      canvas.releasePointerCapture(event.pointerId);
    }
    scheduleLivePrediction();
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);

  resetCanvas();
  ensureModel(setStatus, predictBtn, messages);

  return wrapper;
}
