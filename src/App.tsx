import { useRef } from "react";
import useGestureRecognition from "./components/hands-capture/hooks";

function App() {
  const videoElement = useRef<any>(null);
  const canvasEl = useRef<any>(null);
  useGestureRecognition({
    videoElement,
    canvasEl
  });

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100vh', // Full viewport height
      }}
    >
      {/* Wrapper for Video and Canvas */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <video
          ref={videoElement}
          autoPlay
          width={960}
          height={540}
          style={{
            borderRadius: '18px',
          }}
        />
        <canvas
          ref={canvasEl}
          width={960}
          height={540}
          style={{
            position: 'absolute',
            borderRadius: '18px',
          }}
        />
      </div>
    </div>

  );
}

export default App;