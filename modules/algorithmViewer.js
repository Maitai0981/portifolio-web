export function mountAlgorithmViewer(container, { getMessages, createGuiButton } = {}) {
  const messages = typeof getMessages === "function" ? getMessages() : {};
  const wrapper = container || document.createElement("div");
  wrapper.className = "algo-viewer";
  wrapper.innerHTML = "";

    const hint = document.createElement("div");
    hint.className = "algo-hint";
    hint.textContent = messages.algoHint;
    wrapper.append(hint);

    const controls = document.createElement("div");
    controls.className = "algo-controls";

    const algoSelect = document.createElement("select");
    algoSelect.className = "gui-select";
    algoSelect.setAttribute("aria-label", messages.algoSelectLabel || "Select algorithm");
    [
      { value: "bubble", label: messages.algoBubbleLabel },
      { value: "selection", label: messages.algoSelectionLabel },
      { value: "merge", label: messages.algoMergeLabel },
      { value: "quick", label: messages.algoQuickLabel },
      { value: "heap", label: messages.algoHeapLabel },
      { value: "dijkstra", label: messages.algoDijkstraLabel }
    ].forEach((algo) => {
      const option = document.createElement("option");
      option.value = algo.value;
      option.textContent = algo.label;
      algoSelect.append(option);
    });

    const randomBtn = createGuiButton(messages.algoRandom, () => randomize());
    const runBtn = createGuiButton(messages.algoRun, () => toggleRun());
    const stepBtn = createGuiButton(messages.algoStep, () => stepOnce());

    controls.append(algoSelect, randomBtn, runBtn, stepBtn);
    wrapper.append(controls);

    const view = document.createElement("div");
    view.className = "algo-view";

    const bars = document.createElement("div");
    bars.className = "algo-bars";

    const graph = document.createElement("div");
    graph.className = "algo-graph";

    view.append(bars, graph);
    wrapper.append(view);

    const status = document.createElement("div");
    status.className = "algo-status";
    status.textContent = messages.algoStatusReady;
    wrapper.append(status);

    const BAR_COUNT = 18;
    const graphData = buildDijkstraGraph();
    const graphElements = buildGraphSvg(graphData, graph);
    let values = buildRandomValues();
    let steps = [];
    let stepIndex = 0;
    let running = false;
    let intervalId = null;

    function buildRandomValues() {
      return Array.from({ length: BAR_COUNT }, () => Math.floor(20 + Math.random() * 80));
    }

    function isGraphAlgo(algo) {
      return algo === "dijkstra";
    }

    function buildDijkstraGraph() {
      return {
        nodes: [
          { id: "A", x: 40, y: 40 },
          { id: "B", x: 140, y: 20 },
          { id: "C", x: 240, y: 50 },
          { id: "D", x: 70, y: 130 },
          { id: "E", x: 170, y: 120 },
          { id: "F", x: 260, y: 140 }
        ],
        edges: [
          { from: "A", to: "B", weight: 4 },
          { from: "A", to: "D", weight: 2 },
          { from: "B", to: "C", weight: 6 },
          { from: "B", to: "E", weight: 5 },
          { from: "D", to: "E", weight: 1 },
          { from: "E", to: "C", weight: 2 },
          { from: "D", to: "F", weight: 7 },
          { from: "E", to: "F", weight: 3 }
        ]
      };
    }

    function getEdgeKey(from, to) {
      return [from, to].sort().join("-");
    }

    function buildDistanceLabels(distances) {
      const labels = {};
      graphData.nodes.forEach((node) => {
        const id = node.id;
        const value = distances?.[id];
        labels[id] = Number.isFinite(value) ? String(value) : "INF";
      });
      return labels;
    }

    function buildGraphSvg(data, container) {
      container.innerHTML = "";
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 300 180");
      svg.setAttribute("aria-hidden", "true");
      svg.classList.add("algo-graph-svg");

      const nodeMap = new Map(data.nodes.map((node) => [node.id, node]));
      const edgeEls = new Map();
      const nodeEls = new Map();
      const distEls = new Map();

      data.edges.forEach((edge) => {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);
        if (!from || !to) return;
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);
        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);
        line.classList.add("algo-edge");
        const key = getEdgeKey(edge.from, edge.to);
        line.dataset.edge = key;
        edgeEls.set(key, line);
        svg.append(line);

        const weight = document.createElementNS(svgNS, "text");
        weight.setAttribute("x", (from.x + to.x) / 2);
        weight.setAttribute("y", (from.y + to.y) / 2 - 4);
        weight.classList.add("algo-edge-weight");
        weight.textContent = edge.weight;
        svg.append(weight);
      });

      data.nodes.forEach((node) => {
        const group = document.createElementNS(svgNS, "g");
        group.classList.add("algo-node");
        group.dataset.node = node.id;

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", node.x);
        circle.setAttribute("cy", node.y);
        circle.setAttribute("r", "14");
        group.append(circle);

        const label = document.createElementNS(svgNS, "text");
        label.setAttribute("x", node.x);
        label.setAttribute("y", node.y + 4);
        label.classList.add("algo-node-label");
        label.textContent = node.id;
        group.append(label);

        const dist = document.createElementNS(svgNS, "text");
        dist.setAttribute("x", node.x);
        dist.setAttribute("y", node.y + 26);
        dist.classList.add("algo-node-distance");
        dist.textContent = "INF";
        group.append(dist);

        nodeEls.set(node.id, group);
        distEls.set(node.id, dist);
        svg.append(group);
      });

      container.append(svg);
      return { svg, nodeEls, distEls, edgeEls };
    }

    function buildSteps() {
      const algo = algoSelect.value;
      if (algo === "selection") {
        return buildSelectionSteps(values);
      }
      if (algo === "merge") {
        return buildMergeSteps(values);
      }
      if (algo === "quick") {
        return buildQuickSteps(values);
      }
      if (algo === "heap") {
        return buildHeapSteps(values);
      }
      if (algo === "dijkstra") {
        return buildDijkstraSteps(graphData);
      }
      return buildBubbleSteps(values);
    }

    function buildBubbleSteps(source) {
      const arr = source.slice();
      const output = [];
      for (let i = 0; i < arr.length; i += 1) {
        for (let j = 0; j < arr.length - i - 1; j += 1) {
          output.push({ values: arr.slice(), highlight: [j, j + 1], swap: false });
          if (arr[j] > arr[j + 1]) {
            const temp = arr[j];
            arr[j] = arr[j + 1];
            arr[j + 1] = temp;
            output.push({ values: arr.slice(), highlight: [j, j + 1], swap: true });
          }
        }
      }
      return output;
    }

    function buildSelectionSteps(source) {
      const arr = source.slice();
      const output = [];
      for (let i = 0; i < arr.length - 1; i += 1) {
        let minIndex = i;
        for (let j = i + 1; j < arr.length; j += 1) {
          output.push({ values: arr.slice(), highlight: [minIndex, j], swap: false });
          if (arr[j] < arr[minIndex]) {
            minIndex = j;
          }
        }
        if (minIndex !== i) {
          const temp = arr[i];
          arr[i] = arr[minIndex];
          arr[minIndex] = temp;
          output.push({ values: arr.slice(), highlight: [i, minIndex], swap: true });
        }
      }
      return output;
    }

    function buildMergeSteps(source) {
      const arr = source.slice();
      const temp = source.slice();
      const output = [];

      function mergeSort(start, end) {
        if (end - start <= 1) return;
        const mid = Math.floor((start + end) / 2);
        mergeSort(start, mid);
        mergeSort(mid, end);
        let i = start;
        let j = mid;
        let k = start;
        while (i < mid || j < end) {
          if (j >= end || (i < mid && arr[i] <= arr[j])) {
            temp[k] = arr[i];
            i += 1;
          } else {
            temp[k] = arr[j];
            j += 1;
          }
          output.push({ values: temp.slice(), highlight: [k], swap: false });
          k += 1;
        }
        for (let idx = start; idx < end; idx += 1) {
          arr[idx] = temp[idx];
          output.push({ values: arr.slice(), highlight: [idx], swap: true });
        }
      }

      mergeSort(0, arr.length);
      return output;
    }

    function buildQuickSteps(source) {
      const arr = source.slice();
      const output = [];

      function swap(i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }

      function partition(low, high) {
        const pivotValue = arr[high];
        let i = low;
        for (let j = low; j < high; j += 1) {
          output.push({
            values: arr.slice(),
            highlight: [j, high],
            pivot: high,
            swap: false
          });
          if (arr[j] < pivotValue) {
            if (i !== j) {
              swap(i, j);
              output.push({
                values: arr.slice(),
                highlight: [i, j],
                pivot: high,
                swap: true
              });
            }
            i += 1;
          }
        }
        if (i !== high) {
          swap(i, high);
          output.push({
            values: arr.slice(),
            highlight: [i, high],
            pivot: i,
            swap: true
          });
        }
        return i;
      }

      function quickSort(low, high) {
        if (low >= high) return;
        const pivotIndex = partition(low, high);
        quickSort(low, pivotIndex - 1);
        quickSort(pivotIndex + 1, high);
      }

      quickSort(0, arr.length - 1);
      return output;
    }

    function buildHeapSteps(source) {
      const arr = source.slice();
      const output = [];
      const size = arr.length;

      function swap(i, j) {
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }

      function heapify(heapSize, rootIndex) {
        let largest = rootIndex;
        const left = rootIndex * 2 + 1;
        const right = rootIndex * 2 + 2;

        if (left < heapSize) {
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, left],
            swap: false
          });
          if (arr[left] > arr[largest]) {
            largest = left;
          }
        }

        if (right < heapSize) {
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, right],
            swap: false
          });
          if (arr[right] > arr[largest]) {
            largest = right;
          }
        }

        if (largest !== rootIndex) {
          swap(rootIndex, largest);
          output.push({
            values: arr.slice(),
            highlight: [rootIndex, largest],
            swap: true
          });
          heapify(heapSize, largest);
        }
      }

      for (let i = Math.floor(size / 2) - 1; i >= 0; i -= 1) {
        heapify(size, i);
      }

      for (let end = size - 1; end > 0; end -= 1) {
        swap(0, end);
        output.push({
          values: arr.slice(),
          highlight: [0, end],
          swap: true
        });
        heapify(end, 0);
      }

      return output;
    }

    function buildDijkstraSteps(data) {
      const nodes = data.nodes.map((node) => node.id);
      const adjacency = new Map(nodes.map((id) => [id, []]));
      data.edges.forEach((edge) => {
        adjacency.get(edge.from)?.push({ node: edge.to, weight: edge.weight });
        adjacency.get(edge.to)?.push({ node: edge.from, weight: edge.weight });
      });

      const distances = {};
      nodes.forEach((id) => {
        distances[id] = Number.POSITIVE_INFINITY;
      });
      const start = nodes[0];
      distances[start] = 0;

      const visited = new Set();
      const output = [];

      while (visited.size < nodes.length) {
        let current = null;
        let best = Number.POSITIVE_INFINITY;
        nodes.forEach((id) => {
          if (!visited.has(id) && distances[id] < best) {
            best = distances[id];
            current = id;
          }
        });
        if (!current) break;
        output.push({
          type: "graph",
          current,
          visited: Array.from(visited),
          distances: { ...distances }
        });
        visited.add(current);
        const neighbors = adjacency.get(current) || [];
        neighbors.forEach((neighbor) => {
          if (visited.has(neighbor.node)) return;
          const candidate = distances[current] + neighbor.weight;
          if (candidate < distances[neighbor.node]) {
            distances[neighbor.node] = candidate;
            output.push({
              type: "graph",
              current,
              edge: { from: current, to: neighbor.node },
              visited: Array.from(visited),
              distances: { ...distances }
            });
          }
        });
      }

      output.push({
        type: "graph",
        current: null,
        visited: Array.from(visited),
        distances: { ...distances },
        done: true
      });

      return output;
    }

    function ensureBars() {
      if (bars.children.length === BAR_COUNT) return;
      bars.innerHTML = "";
      for (let i = 0; i < BAR_COUNT; i += 1) {
        const bar = document.createElement("div");
        bar.className = "algo-bar";
        bars.append(bar);
      }
    }

    function renderBars(step) {
      ensureBars();
      const highlights = step?.highlight || [];
      const isSwap = step?.swap;
      const pivotIndex = Number.isInteger(step?.pivot) ? step.pivot : null;
      Array.from(bars.children).forEach((bar, index) => {
        bar.style.height = `${values[index]}%`;
        bar.classList.toggle("active", highlights.includes(index));
        bar.classList.toggle("swap", isSwap && highlights.includes(index));
        bar.classList.toggle("pivot", pivotIndex === index);
      });
    }

    function renderGraphBase() {
      renderGraph({
        current: null,
        visited: [],
        distances: buildInitialDistances(graphData)
      });
    }

    function renderGraph(step) {
      if (!graphElements) return;
      const visited = new Set(step?.visited || []);
      const current = step?.current;
      const labels =
        step?.labels ||
        buildDistanceLabels(step?.distances || buildInitialDistances(graphData));
      graphElements.nodeEls.forEach((group, id) => {
        group.classList.toggle("visited", visited.has(id));
        group.classList.toggle("current", current === id);
        const distEl = graphElements.distEls.get(id);
        if (distEl) {
          distEl.textContent = labels[id] ?? "";
        }
      });

      graphElements.edgeEls.forEach((line) => line.classList.remove("active", "selected"));
      const selectedEdges = step?.selectedEdges || [];
      selectedEdges.forEach((edge) => {
        const key = getEdgeKey(edge.from, edge.to);
        const edgeEl = graphElements.edgeEls.get(key);
        if (edgeEl) edgeEl.classList.add("selected");
      });
      if (step?.edge) {
        const key = getEdgeKey(step.edge.from, step.edge.to);
        const edgeEl = graphElements.edgeEls.get(key);
        if (edgeEl) edgeEl.classList.add("active");
      }
    }

    function buildInitialDistances(data) {
      const distances = {};
      data.nodes.forEach((node, index) => {
        distances[node.id] = index === 0 ? 0 : Number.POSITIVE_INFINITY;
      });
      return distances;
    }

    function prepareView() {
      const graphMode = isGraphAlgo(algoSelect.value);
      bars.style.display = graphMode ? "none" : "flex";
      graph.style.display = graphMode ? "block" : "none";
      randomBtn.textContent = graphMode ? messages.algoReset : messages.algoRandom;
    }

    function updateRunLabel() {
      runBtn.textContent = running ? messages.algoPause : messages.algoRun;
    }

    function updateStatus(text) {
      status.textContent = text;
    }

    function resetSteps() {
      steps = [];
      stepIndex = 0;
      updateStatus(messages.algoStatusReady);
      if (isGraphAlgo(algoSelect.value)) {
        renderGraphBase();
      }
    }

    function randomize() {
      if (isGraphAlgo(algoSelect.value)) {
        running = false;
        clearInterval(intervalId);
        intervalId = null;
        resetSteps();
        updateRunLabel();
        return;
      }
      values = buildRandomValues();
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      resetSteps();
      updateRunLabel();
      renderBars();
    }

    function applyStep() {
      const step = steps[stepIndex];
      if (!step) return false;
      if (isGraphAlgo(algoSelect.value)) {
        renderGraph(step);
      } else {
        values = step.values.slice();
        renderBars(step);
      }
      stepIndex += 1;
      return stepIndex < steps.length;
    }

    function stepOnce() {
      if (!steps.length || stepIndex >= steps.length) {
        steps = buildSteps();
        stepIndex = 0;
      }
      if (!applyStep()) {
        updateStatus(messages.algoStatusDone);
      } else {
        updateStatus(messages.algoStatusRunning);
      }
    }

    function startRun() {
      if (!steps.length || stepIndex >= steps.length) {
        steps = buildSteps();
        stepIndex = 0;
      }
      if (!steps.length) {
        updateStatus(messages.algoStatusDone);
        return;
      }
      running = true;
      updateRunLabel();
      updateStatus(messages.algoStatusRunning);
      intervalId = setInterval(() => {
        const hasMore = applyStep();
        if (!hasMore) {
          stopRun();
          updateStatus(messages.algoStatusDone);
        }
      }, 140);
    }

    function stopRun() {
      running = false;
      clearInterval(intervalId);
      intervalId = null;
      updateRunLabel();
    }

    function toggleRun() {
      if (running) {
        stopRun();
        updateStatus(messages.algoStatusReady);
        return;
      }
      startRun();
    }

    algoSelect.addEventListener("change", () => {
      stopRun();
      resetSteps();
      prepareView();
      if (!isGraphAlgo(algoSelect.value)) {
        renderBars();
      }
    });

    prepareView();
    renderBars();
    updateRunLabel();

    wrapper.__cleanup = () => {
      clearInterval(intervalId);
    };
    return wrapper;
}

