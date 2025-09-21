const URL = "my_model/";
let model, webcam, labelContainer, maxPredictions, classNames;
let currentBest = { class: "Unknown", prob: 0 };

async function init() {
  document.getElementById("loading").style.display = "block";
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  const testPred = await model.predict(document.createElement("canvas"));
  classNames = testPred.map(p => p.className);

  webcam = new tmImage.Webcam(300, 300, true);
  await webcam.setup();
  await webcam.play();
  document.getElementById("webcam-container").appendChild(webcam.canvas);

  labelContainer = document.getElementById("label-container");
  labelContainer.innerHTML = "";
  for (let i = 0; i < maxPredictions; i++) {
    const div = document.createElement("div");
    div.className = "label";
    div.innerHTML = `
      <span>${classNames[i]}</span>
      <div class="progress-bar"><div class="progress" id="bar-${i}"></div></div>
    `;
    labelContainer.appendChild(div);
  }

  document.getElementById("loading").style.display = "none";
  window.requestAnimationFrame(loop);
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);

  let bestClass = prediction[0].className;
  let bestProb = prediction[0].probability;

  for (let i = 0; i < prediction.length; i++) {
    const prob = (prediction[i].probability * 100).toFixed(1);
    const bar = document.getElementById("bar-" + i);
    bar.style.width = prob + "%";
    bar.innerText = prob + "%";

    if (prediction[i].className === "Healthy") {
      bar.className = "progress healthy";
    } else {
      bar.className = "progress unhealthy";
    }

    if (prediction[i].probability > bestProb) {
      bestClass = prediction[i].className;
      bestProb = prediction[i].probability;
    }
  }

  // store current best
  currentBest = { class: bestClass, prob: bestProb };

  const resultDiv = document.getElementById("final-result");
  resultDiv.style.display = "block";
  if (bestClass === "Healthy") {
    resultDiv.className = "healthy";
    resultDiv.innerText = "✅ Prediction: Healthy (~200 kcal)";
  } else {
    resultDiv.className = "unhealthy";
    resultDiv.innerText = "❌ Prediction: Unhealthy (~450 kcal)";
  }
}

// Save current best to history
function saveToHistory() {
  if (!currentBest.class) return;
  const history = document.getElementById("history");
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.innerText = `${time} → ${currentBest.class} (${(currentBest.prob*100).toFixed(1)}%)`;
  history.prepend(entry);
  if (history.childNodes.length > 6) history.removeChild(history.lastChild);
}

// Dark/Light Mode
function toggleTheme() {
  document.body.classList.toggle("dark");
}

// 📸 Capture Snapshot with Prediction Overlay
function captureSnapshot() {
  if (!webcam) return;

  const snapshotCanvas = document.createElement("canvas");
  snapshotCanvas.width = webcam.canvas.width;
  snapshotCanvas.height = webcam.canvas.height;
  const ctx = snapshotCanvas.getContext("2d");

  // Draw webcam frame
  ctx.drawImage(webcam.canvas, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

  // Add prediction label
  let label = "No Prediction";
  let color = "white";

  if (currentBest && currentBest.class) {
    if (currentBest.class === "Healthy") {
      label = "Healthy - ~200 Cal";
      color = "#28a745";
    } else {
      label = "Unhealthy - ~450 Cal";
      color = "#c62828";
    }
  }

  ctx.font = "28px Arial";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "black";  // outline
  ctx.fillStyle = color;

  const x = 10;
  const y = snapshotCanvas.height - 20;

  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);

  // Save the annotated snapshot
  const link = document.createElement("a");
  link.download = "snapshot.png";
  link.href = snapshotCanvas.toDataURL("image/png");
  link.click();
}
