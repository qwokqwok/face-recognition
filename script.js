const video = document.getElementById("video");
const modelPath = "/face-recognition/models";
let stream = null;
let detectionInterval = null;
let canvas = null;
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
  faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
  faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
  faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
  faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
]).then();

async function startCamera() {
  if (stream) return; // already running

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play();
      startDetection();
    };
  } catch (err) {
    console.error("Camera error:", err);
  }
}
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }

  if (canvas) {
    canvas.remove();
    canvas = null;
  }

  console.log("Camera stopped");
}
function startDetection() {
  canvas = faceapi.createCanvasFromMedia(video);
  document.querySelector(".video-container").append(canvas);

  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  detectionInterval = setInterval(async () => {
    const drawDetections = document.getElementById("draw-detections");
    const drawLandmarks = document.getElementById("draw-landmarks");
    const drawExpressions = document.getElementById("draw-expressions");

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks()
      .withFaceExpressions();

    const resized = faceapi.resizeResults(detections, displaySize);

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (drawDetections?.checked) faceapi.draw.drawDetections(canvas, resized);

    if (drawLandmarks?.checked) faceapi.draw.drawFaceLandmarks(canvas, resized);

    if (drawExpressions?.checked)
      faceapi.draw.drawFaceExpressions(canvas, resized);
  }, 100);
}

function startImageRecognition() {
  const imageUpload = document.getElementById("imageUpload");
  const previewImage = document.getElementById("previewImage");
  const overlay = document.getElementById("overlay");

  // Hindari duplicate listener
  if (imageUpload.dataset.listenerAdded) return;
  imageUpload.dataset.listenerAdded = "true";

  imageUpload.addEventListener("change", async () => {
    const file = imageUpload.files[0];
    if (!file) return;

    const image = await faceapi.bufferToImage(file);
    previewImage.src = image.src;

    previewImage.onload = async () => {
      const rect = previewImage.getBoundingClientRect();

      overlay.width = rect.width;
      overlay.height = rect.height;

      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = rect.width + "px";
      overlay.style.height = rect.height + "px";

      const displaySize = {
        width: rect.width,
        height: rect.height,
      };

      faceapi.matchDimensions(overlay, displaySize);

      const detections = await faceapi
        .detectAllFaces(previewImage, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks();

      const resized = faceapi.resizeResults(detections, displaySize);

      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      faceapi.draw.drawDetections(overlay, resized);
      faceapi.draw.drawFaceLandmarks(overlay, resized);
    };
  });
}
