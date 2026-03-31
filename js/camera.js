(function initCamera(global) {
  const FocusFlow = global.FocusFlow || (global.FocusFlow = {});

  class CameraTracker {
    constructor() {
      this.enabled = false;
      this.supported = !!navigator.mediaDevices?.getUserMedia;
      this.permissionBlocked = false;

      this.stream = null;
      this.video = null;
      this.detector = null;
      this.detectionEngine = null;
      this.mpLastDetections = [];

      this.monitorTimer = null;
      this.detecting = false;
      this.running = false;
    }

    async enable() {
      this.enabled = true;
      return this.ensureReady();
    }

    disable() {
      this.enabled = false;
      this.stopStream();
    }

    stopMonitoring() {
      this.running = false;
      if (this.monitorTimer) {
        clearTimeout(this.monitorTimer);
        this.monitorTimer = null;
      }
    }

    stopStream() {
      this.stopMonitoring();
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }
      this.stream = null;
      this.video = null;
      this.detector = null;
      this.detectionEngine = null;
      this.mpLastDetections = [];
      this.detecting = false;
    }

    async ensureReady() {
      if (!this.supported || !this.enabled) return false;
      if (this.stream && this.video && this.detector) return true;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        this.stream = stream;
        this.video = video;

        if ('FaceDetector' in global) {
          this.detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          this.detectionEngine = 'Native';
        } else if ('FaceDetection' in global) {
          const mp = new global.FaceDetection({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
          });
          mp.setOptions({ model: 'short', minDetectionConfidence: 0.3 });
          mp.onResults((results) => {
            this.mpLastDetections = results?.detections || [];
          });
          this.detector = mp;
          this.detectionEngine = 'MediaPipe';
        } else {
          throw new Error('No detection engine available');
        }

        this.permissionBlocked = false;
        return true;
      } catch {
        this.permissionBlocked = true;
        this.enabled = false;
        this.stopStream();
        return false;
      }
    }

    async detectFaces() {
      if (!this.detector || !this.video) return [];
      if ((this.video.videoWidth || 0) < 80 || (this.video.videoHeight || 0) < 80) return null;

      if (this.detectionEngine === 'Native') {
        const faces = await this.detector.detect(this.video);
        return faces.map((face) => ({
          x: face.boundingBox.x,
          y: face.boundingBox.y,
          width: face.boundingBox.width,
          height: face.boundingBox.height,
        }));
      }

      if (this.detectionEngine === 'MediaPipe') {
        await this.detector.send({ image: this.video });
        const vw = this.video.videoWidth || 1;
        const vh = this.video.videoHeight || 1;
        return this.mpLastDetections
          .map((det) => {
            const box = det.locationData?.relativeBoundingBox;
            if (!box) return null;
            return {
              x: box.xmin * vw,
              y: box.ymin * vh,
              width: box.width * vw,
              height: box.height * vh,
            };
          })
          .filter(Boolean);
      }

      return [];
    }

    async startMonitoring({ shouldRun, onResult, onError }) {
      if (!this.enabled || !this.supported) return;
      const ready = await this.ensureReady();
      if (!ready) {
        onError?.();
        return;
      }

      this.stopMonitoring();
      this.running = true;

      const loop = async () => {
        if (!this.running) return;

        if (!shouldRun() || this.detecting) {
          this.monitorTimer = setTimeout(loop, 900);
          return;
        }

        const start = performance.now();
        let nextDelay = 1400;

        try {
          this.detecting = true;
          const faces = await this.detectFaces();
          const elapsed = performance.now() - start;

          if (elapsed > 420) nextDelay = 2300;
          else if (elapsed > 220) nextDelay = 1800;
          else nextDelay = 1200;

          onResult?.({
            hasFace: Array.isArray(faces) ? faces.length > 0 : null,
            face: Array.isArray(faces) ? (faces[0] || null) : null,
            elapsed,
            nextDelay,
            detectionEngine: this.detectionEngine,
          });
        } catch {
          this.running = false;
          onError?.();
        } finally {
          this.detecting = false;
        }

        if (this.running) {
          this.monitorTimer = setTimeout(loop, nextDelay);
        }
      };

      loop();
    }
  }

  FocusFlow.CameraTracker = CameraTracker;
})(window);
