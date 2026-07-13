"use client";

import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { useAuth } from "@/hooks/useAuth"; 
import { Camera, ShieldCheck } from "lucide-react";

export function KYCPage() {
  const { user } = useAuth();
  const [cnic, setCnic] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  
  // Camera & AI tracking states
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState("Loading AI Models...");
  const [currentStep, setCurrentStep] = useState<"LEFT" | "RIGHT" | "DOWN">("LEFT");
  const [capturedImages, setCapturedImages] = useState<{ left?: string; right?: string; down?: string }>({});
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep step in ref to avoid React state closure stale loops
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // 1. Load AI Models from CDN on Component Mount
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setFaceDetectionStatus("AI Biometrics Ready.");
      } catch (err) {
        console.error("Failed to load AI models", err);
        setFaceDetectionStatus("Biometric initializing failed.");
      }
    };
    loadModels();
  }, []);

  // 2. Core Photo Capture Function
  const capturePhoto = (step: "LEFT" | "RIGHT" | "DOWN") => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL("image/jpeg");
        setCapturedImages(prev => ({ ...prev, [step.toLowerCase()]: imageSrc }));
        return imageSrc;
      }
    }
    return null;
  };

  // Camera Management Controls
  const startCamera = async () => {
    try {
      setError("");
      setCameraActive(true);
      setCurrentStep("LEFT");
      setCapturedImages({});
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please allow permissions.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // 3. Real-time Live Face Angle Verification Loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded || !videoRef.current) return;

    let isComponentMounted = true;
    const video = videoRef.current;

    const detectFaceAngles = async () => {
      if (!video || video.paused || video.ended || !isComponentMounted) return;

      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections) {
        const landmarks = detections.landmarks;
        const jawOutline = landmarks.getJawOutline();
        const nose = landmarks.getNose();

        if (jawOutline.length > 0 && nose.length > 0) {
          const noseX = nose[0].x;
          const jawLeftX = jawOutline[0].x;
          const jawRightX = jawOutline[jawOutline.length - 1].x;

          const totalWidth = jawRightX - jawLeftX;
          const relativeNosePos = (noseX - jawLeftX) / totalWidth;
          
          const activeStep = currentStepRef.current;

          if (activeStep === "LEFT" && relativeNosePos < 0.40) {
            capturePhoto("LEFT");
            setCurrentStep("RIGHT");
            setFaceDetectionStatus("✅ Left side verified! Now turn RIGHT ▶️");
          } else if (activeStep === "RIGHT" && relativeNosePos > 0.60) {
            capturePhoto("RIGHT");
            setCurrentStep("DOWN");
            setFaceDetectionStatus("✅ Right side verified! Now look DOWN ▼");
          } else if (activeStep === "DOWN") {
            const noseTipY = nose[3].y;
            const chinY = jawOutline[8].y;
            const noseToChinDist = chinY - noseTipY;
            
            if (noseToChinDist < 58) { 
              capturePhoto("DOWN");
              setFaceDetectionStatus("✅ Profile validation completed!");
              stopCamera();
            } else {
              setFaceDetectionStatus("Please tilt your head DOWN ▼");
            }
          }
        }
      } else {
        const activeStep = currentStepRef.current;
        if (activeStep === "LEFT") setFaceDetectionStatus("Turn your face to the LEFT ◀️");
        if (activeStep === "RIGHT") setFaceDetectionStatus("Turn your face to the RIGHT ▶️");
        if (activeStep === "DOWN") setFaceDetectionStatus("Please tilt your head DOWN ▼");
      }

      if (cameraActive && isComponentMounted) {
        setTimeout(detectFaceAngles, 200);
      }
    };

    const handlePlay = () => {
      detectFaceAngles();
    };

    video.addEventListener("play", handlePlay);
    
    // Fallback trigger if event listener skips on some devices
    if (!video.paused) {
      detectFaceAngles();
    }

    return () => {
      isComponentMounted = false;
      video.removeEventListener("play", handlePlay);
    };
  }, [cameraActive, modelsLoaded]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");   
    setError("");

    if (cnic.length < 13) {
      setError("Please enter a valid 13-digit CNIC number!");
      setLoading(false);
      return;
    }

    if (!capturedImages.left || !capturedImages.right || !capturedImages.down) {
      setError("Please complete all 3 face biometric steps first!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          cnicNumber: cnic,
          biometricPhotos: capturedImages
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save KYC data.");

      setMessage("Biometric KYC details submitted successfully!");
      setCnic("");
      setCapturedImages({});
    } catch (err: any) {
      setError(err.message || "An error occurred while saving KYC.");
    } finally {
      setLoading(false);
    }
  };

  if (user && (user as any).kycStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl max-w-md shadow-lg">
          <ShieldCheck className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-white mb-2">KYC Already Submitted</h2>
          <p className="text-gray-400 mb-6">
            Your Identity Verification (KYC) details have already been received. Your current status is: 
            <span className="text-cyan-400 font-semibold uppercase block mt-1">{(user as any).kycStatus}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl text-white">
      <div className="flex flex-col items-center mb-6 text-center">
        <ShieldCheck className="w-12 h-12 text-cyan-400 mb-2" />
        <h2 className="text-2xl font-bold text-cyan-400">Identity Verification (KYC)</h2>
        <p className="text-sm text-slate-400 mt-1">
          Secure active liveness detection and biometric scan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            CNIC Number (Without dashes)
          </label>
          <input
            type="text"
            placeholder="e.g. 1560603601577"
            maxLength={13}
            value={cnic}
            onChange={(e) => setCnic(e.target.value.replace(/\D/g, ""))}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Live Liveness Biometric Scan
          </label>

          {!cameraActive && (
            <button
              type="button"
              onClick={startCamera}
              className="w-full py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 bg-slate-950 hover:bg-slate-900 rounded-lg transition text-slate-400 hover:text-cyan-400"
            >
              <Camera className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">Start Live AI Verification</span>
            </button>
          )}

          {cameraActive && (
            <div className="relative overflow-hidden rounded-lg bg-black border border-slate-800">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto aspect-video object-cover" />
              
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                {/* Active AI Status Instruction Badge */}
                <div className="mx-auto bg-slate-950/90 text-cyan-400 font-mono text-xs px-4 py-2 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.3)] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  {faceDetectionStatus.toUpperCase()}
                </div>

                {/* Face Tracker Frame */}
                <div className="mx-auto w-44 h-44 border-2 border-dashed border-cyan-400/40 rounded-full flex items-center justify-center">
                  <div className="w-40 h-40 border border-cyan-400/20 rounded-full animate-pulse" />
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 mt-2">
                  <span className={`h-1.5 w-10 rounded transition-colors ${capturedImages.left ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'}`} />
                  <span className={`h-1.5 w-10 rounded transition-colors ${capturedImages.right ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'}`} />
                  <span className={`h-1.5 w-10 rounded transition-colors ${capturedImages.down ? 'bg-cyan-500 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'}`} />
                </div>
              </div>
            </div>
          )}

          {capturedImages.left && capturedImages.right && capturedImages.down && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-center text-sm font-medium">
              ✅ 3/3 Biometric Face Actions Verified Successfully!
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {message && <p className="text-green-400 text-sm font-medium">{message}</p>}
        {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading || !capturedImages.down}
          className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 font-bold rounded-lg transition duration-200 shadow-md shadow-cyan-500/10"
        >
          {loading ? "Submitting Data..." : "Submit Biometric KYC"}
        </button>
      </form>
    </div>
  );
}
export default KYCPage;