import { useEffect, useRef } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Hands, HAND_CONNECTIONS } from "@mediapipe/hands";

const maxVideoWidth = 960;
const maxVideoHeight = 540;

const KEY_PRESS_SOUND = new Audio("/keypress.mp3"); // public/keypress.mp3
const SPACE_SOUND = new Audio("/space.mp3"); // public/space.mp3
const BACKSPACE_SOUND = new Audio("/keypress.mp3");
// Constants for keyboard layout and dimensions
const KEYBOARD_LAYOUT = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "/"],
  ["BS", "SPACE"],
];
const KEY_WIDTH = 50;
const KEY_HEIGHT = 50;
const KEY_SPACING = 60;
const KEYBOARD_X = 200;
const KEYBOARD_Y = 100;
const KEY_DETECTION_THRESHOLD = 30; // Adjusted threshold
const SPACE_KEY_WIDTH = KEY_WIDTH * 4; // 4 times wider than normal keys
const KEY_BORDER_RADIUS = 8;

const COOLDOWN_TIME = 1000;

// Add these constants at the top
const INDEX_FINGER_TIP = 8;
const THUMB_TIP = 4;
const PINCH_THRESHOLD = 0.05;

import { RefObject } from "react";

interface IHandGestureLogic {
  videoElement: RefObject<any>;
  canvasEl: RefObject<any>;
}

function useGestureRecognition({ videoElement, canvasEl }: IHandGestureLogic) {
  const hands = useRef<any>(null);
  const camera = useRef<any>(null);
  const outputTextRef = useRef("");
  const lastKeyPressed = useRef<string | null>(null);
  const isCooldownActive = useRef(false);

  const detectClosestKey = (
    fingerX: number,
    fingerY: number,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    let closestKey = null;
    let minDistance = Infinity;

    // Mirror the x-coordinate and convert to pixel coordinates
    const pixelX = (1 - fingerX) * canvasWidth;
    const pixelY = fingerY * canvasHeight;

    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((key, colIndex) => {
        const width = key === "SPACE" ? SPACE_KEY_WIDTH : KEY_WIDTH;
        const keyX = KEYBOARD_X + colIndex * KEY_SPACING + width / 2;
        const keyY = KEYBOARD_Y + rowIndex * KEY_SPACING + KEY_HEIGHT / 2;

        // For SPACE key, check if point is within the wider area
        if (key === "SPACE") {
          const leftEdge = KEYBOARD_X + colIndex * KEY_SPACING;
          const rightEdge = leftEdge + SPACE_KEY_WIDTH;
          const topEdge = KEYBOARD_Y + rowIndex * KEY_SPACING;
          const bottomEdge = topEdge + KEY_HEIGHT;

          // If point is within space bar bounds, calculate distance to center
          if (
            pixelX >= leftEdge &&
            pixelX <= rightEdge &&
            pixelY >= topEdge &&
            pixelY <= bottomEdge
          ) {
            const distance = Math.sqrt(
              Math.pow(pixelX - keyX, 2) + Math.pow(pixelY - keyY, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestKey = key;
            }
          }
        } else {
          // Normal key distance calculation
          const distance = Math.sqrt(
            Math.pow(pixelX - keyX, 2) + Math.pow(pixelY - keyY, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestKey = key;
          }
        }
      });
    });

    return minDistance < KEY_DETECTION_THRESHOLD ? closestKey : null;
  };

  const drawKeyboardTitle = (ctx: CanvasRenderingContext2D) => {
    const text = "VIRTUAL KEYBOARD";
    const fontSize = 14;
    const depth = 10;

    ctx.save();
    ctx.font = `bold ${fontSize}px Arial`;
    const textMetrics = ctx.measureText(text);

    // Calculate position
    const spaceBarRow = KEYBOARD_LAYOUT.length - 1;
    const spaceBarCol = KEYBOARD_LAYOUT[spaceBarRow].indexOf("SPACE");
    const textX = KEYBOARD_X + spaceBarCol * KEY_SPACING + SPACE_KEY_WIDTH + 80;
    const textY =
      KEYBOARD_Y + spaceBarRow * KEY_SPACING + KEY_HEIGHT / 2 + fontSize / 2;

    // Background dimensions
    const padding = 10;
    const boxWidth = textMetrics.width + padding * 2;
    const boxHeight = fontSize + padding;

    // Draw patterned background
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      textX - padding,
      textY - fontSize - padding / 2,
      boxWidth,
      boxHeight,
      5
    );
    ctx.clip();

    // Create diagonal striped pattern
    const patternSize = 10;
    for (let i = -boxHeight; i < boxWidth + boxHeight; i += patternSize) {
      ctx.beginPath();
      ctx.moveTo(textX - padding + i, textY - fontSize - padding / 2);
      ctx.lineTo(
        textX - padding + i + boxHeight,
        textY - fontSize - padding / 2 + boxHeight
      );
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = patternSize / 2;
      ctx.stroke();
    }

    // Add gradient overlay
    const bgGradient = ctx.createLinearGradient(
      textX - padding,
      textY - fontSize - padding / 2,
      textX - padding,
      textY - fontSize - padding / 2 + boxHeight
    );
    bgGradient.addColorStop(0, "rgba(40, 40, 45, 0.9)");
    bgGradient.addColorStop(1, "rgba(20, 20, 25, 0.9)");
    ctx.fillStyle = bgGradient;
    ctx.fill();

    // Inner shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fill();
    ctx.restore();

    // Draw 3D extrusion
    for (let i = depth; i > 0; i--) {
      ctx.fillStyle = `rgba(100, 100, 110, ${0.5 - i / depth / 2})`;
      ctx.fillText(text, textX + i / 2, textY + i / 2);
    }

    // Main text with metallic gradient
    const textGradient = ctx.createLinearGradient(
      textX,
      textY - fontSize,
      textX,
      textY
    );
    textGradient.addColorStop(0, "rgb(0, 208, 255)");
    textGradient.addColorStop(0.4, "rgb(0, 208, 255)");
    textGradient.addColorStop(0.5, "rgb(0, 208, 255)");
    textGradient.addColorStop(0.6, "rgb(0, 208, 255)");
    textGradient.addColorStop(1, "rgb(0, 208, 255)");

    ctx.fillStyle = textGradient;
    ctx.fillText(text, textX, textY);

    // Top highlight
    const highlightGradient = ctx.createLinearGradient(
      textX,
      textY - fontSize,
      textX,
      textY - fontSize / 2
    );
    highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    highlightGradient.addColorStop(0.2, "rgba(255, 255, 255, 0.5)");
    highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.fillStyle = highlightGradient;
    ctx.fillText(text, textX, textY);

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  };

  const drawKeyboard = (
    ctx: CanvasRenderingContext2D,
    pressedKey: string | null
  ) => {
    const keyboardWidth = KEYBOARD_LAYOUT[0].length * KEY_SPACING + 40;
    const keyboardHeight = KEYBOARD_LAYOUT.length * KEY_SPACING + 40;
    const keyboardPadding = 20;
    const keyboardDepth = 15;
    const centerX = KEYBOARD_X + keyboardWidth / 2;
    const borderRadius = 12;

    ctx.save();

    // Base shape with perspective
    ctx.transform(1, 0, 0, 1, 0, 0);

    // Draw curved keyboard base
    ctx.beginPath();
    ctx.moveTo(
      KEYBOARD_X - keyboardPadding + borderRadius,
      KEYBOARD_Y - keyboardPadding
    );

    // Top edge with curves
    ctx.arcTo(
      KEYBOARD_X - keyboardPadding + keyboardWidth,
      KEYBOARD_Y - keyboardPadding,
      KEYBOARD_X - keyboardPadding + keyboardWidth,
      KEYBOARD_Y - keyboardPadding + borderRadius,
      borderRadius
    );

    // Right edge
    ctx.lineTo(
      KEYBOARD_X - keyboardPadding + keyboardWidth,
      KEYBOARD_Y - keyboardPadding + keyboardHeight - borderRadius
    );

    // Bottom curved edge
    ctx.bezierCurveTo(
      centerX + keyboardWidth / 3,
      KEYBOARD_Y - keyboardPadding + keyboardHeight + keyboardDepth,
      centerX - keyboardWidth / 3,
      KEYBOARD_Y - keyboardPadding + keyboardHeight + keyboardDepth,
      KEYBOARD_X - keyboardPadding,
      KEYBOARD_Y - keyboardPadding + keyboardHeight - borderRadius
    );

    // Left edge
    ctx.lineTo(
      KEYBOARD_X - keyboardPadding,
      KEYBOARD_Y - keyboardPadding + borderRadius
    );
    ctx.arcTo(
      KEYBOARD_X - keyboardPadding,
      KEYBOARD_Y - keyboardPadding,
      KEYBOARD_X - keyboardPadding + borderRadius,
      KEYBOARD_Y - keyboardPadding,
      borderRadius
    );
    ctx.closePath();

    // Base metallic gradient
    const baseGradient = ctx.createLinearGradient(
      KEYBOARD_X,
      KEYBOARD_Y - keyboardPadding,
      KEYBOARD_X,
      KEYBOARD_Y + keyboardHeight + keyboardDepth
    );
    baseGradient.addColorStop(0, "rgba(220, 225, 230, 0.6)");
    baseGradient.addColorStop(0.3, "rgba(190, 200, 210, 0.6)");
    baseGradient.addColorStop(0.7, "rgba(160, 170, 180, 0.6)");
    baseGradient.addColorStop(1, "rgba(140, 150, 160, 0.6)");

    ctx.fillStyle = baseGradient;
    ctx.fill();

    // Base shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 20;
    ctx.fill();

    // Draw keys
    KEYBOARD_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((key, colIndex) => {
        const x = KEYBOARD_X + colIndex * KEY_SPACING;
        const y = KEYBOARD_Y + rowIndex * KEY_SPACING;
        const width = key === "SPACE" ? SPACE_KEY_WIDTH : KEY_WIDTH;
        const isPressed = key === pressedKey;
        const keyHeight = isPressed ? 2 : 4;

        ctx.save();

        // Create clipping path with rounded corners
        ctx.beginPath();
        ctx.roundRect(
          x,
          y + (isPressed ? 2 : 0),
          width,
          KEY_HEIGHT - (isPressed ? 2 : 0),
          KEY_BORDER_RADIUS
        );
        ctx.clip();

        // Key shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = isPressed ? 4 : 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = isPressed ? 2 : 5;

        // Key face with metallic gradient
        ctx.beginPath();
        ctx.roundRect(
          x,
          y + (isPressed ? 2 : 0),
          width,
          KEY_HEIGHT - (isPressed ? 2 : 0),
          KEY_BORDER_RADIUS
        );

        const keyGradient = ctx.createLinearGradient(x, y, x, y + KEY_HEIGHT);
        if (isPressed) {
          keyGradient.addColorStop(0, "rgba(180, 185, 190, 0.9)");
          keyGradient.addColorStop(0.5, "rgba(160, 165, 170, 0.9)");
          keyGradient.addColorStop(1, "rgba(140, 145, 150, 0.9)");
        } else {
          keyGradient.addColorStop(0, "rgba(230, 235, 240, 0.9)");
          keyGradient.addColorStop(0.5, "rgba(210, 215, 220, 0.9)");
          keyGradient.addColorStop(1, "rgba(190, 195, 200, 0.9)");
        }
        ctx.fillStyle = keyGradient;
        ctx.fill();

        ctx.restore();
        ctx.save();

        // Key side face (3D effect)
        if (!isPressed) {
          ctx.beginPath();
          ctx.moveTo(x, y + KEY_HEIGHT);
          ctx.arcTo(
            x,
            y + KEY_HEIGHT + keyHeight,
            x + KEY_BORDER_RADIUS,
            y + KEY_HEIGHT + keyHeight,
            KEY_BORDER_RADIUS
          );
          ctx.lineTo(x + width - KEY_BORDER_RADIUS, y + KEY_HEIGHT + keyHeight);
          ctx.arcTo(
            x + width,
            y + KEY_HEIGHT + keyHeight,
            x + width,
            y + KEY_HEIGHT,
            KEY_BORDER_RADIUS
          );
          ctx.lineTo(x + width, y + KEY_HEIGHT);
          ctx.closePath();

          const keySideGradient = ctx.createLinearGradient(
            0,
            y + KEY_HEIGHT,
            0,
            y + KEY_HEIGHT + keyHeight
          );
          keySideGradient.addColorStop(0, "rgba(160, 165, 170, 0.9)");
          keySideGradient.addColorStop(1, "rgba(140, 145, 150, 0.9)");
          ctx.fillStyle = keySideGradient;
          ctx.fill();
        }

        // Key shine effect
        ctx.beginPath();
        ctx.roundRect(
          x,
          y + (isPressed ? 2 : 0),
          width,
          KEY_HEIGHT - (isPressed ? 2 : 0),
          KEY_BORDER_RADIUS
        );
        const keyShine = ctx.createLinearGradient(
          x,
          y,
          x + width,
          y + KEY_HEIGHT
        );
        keyShine.addColorStop(0, "rgba(255, 255, 255, 0.6)");
        keyShine.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
        keyShine.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = keyShine;
        ctx.fill();

        ctx.restore();

        // Key text with metallic effect
        ctx.save();
        const textX = key === "SPACE" ? x + (width / 2 - 25) : x + 15;
        const textY = y + 28 + (isPressed ? 1 : 0);

        // Text gradient
        const textGradient = ctx.createLinearGradient(
          textX,
          textY - 16,
          textX,
          textY
        );
        textGradient.addColorStop(0, "rgb(220, 220, 225)");
        textGradient.addColorStop(0.5, "rgb(160, 160, 165)");
        textGradient.addColorStop(1, "rgb(120, 120, 125)");

        ctx.font = " 16px Arial";
        ctx.fillStyle = textGradient;

        // Add subtle shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;

        // Draw text with stroke for more definition
        ctx.strokeStyle = "rgba(100, 100, 105, 0.3)";
        ctx.lineWidth = 0.1;
        ctx.strokeText(key, textX, textY);
        ctx.fillText(key, textX, textY);

        ctx.restore();
      });
    });

    ctx.restore();

    drawKeyboardTitle(ctx);
  };

  const drawOutputText = (ctx: CanvasRenderingContext2D) => {
    if (outputTextRef.current) {
      console.log("Drawing text:", outputTextRef.current); // Debug log

      const text = "Output Text: " + outputTextRef.current;
      const fontSize = 24;
      const padding = 20;

      // Set up text properties
      ctx.font = `${fontSize}px Arial`;
      const textWidth = ctx.measureText(text).width;
      const boxWidth = Math.max(300, textWidth + padding * 2);
      const boxHeight = fontSize + padding * 2;

      // Position box in visible area
      const x = 200;
      const y = canvasEl.current!.height - 100;

      // Draw background
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(
        x - padding,
        y - fontSize - padding,
        boxWidth,
        boxHeight,
        8
      );

      // Glassy effect
      const gradient = ctx.createLinearGradient(x, y, x, y + boxHeight);
      gradient.addColorStop(0, "rgba(0, 0, 0, 0.7)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.fillStyle = "white";
      ctx.fillText(text, x, y - padding / 2);

      ctx.restore();
    }
  };

  // Add this function before handleKeyPress
  const playKeySound = (key: string) => {
    let sound;
    switch (key) {
      case "SPACE":
        sound = SPACE_SOUND;
        break;
      case "BS":
        sound = BACKSPACE_SOUND;
        break;
      default:
        sound = KEY_PRESS_SOUND;
    }

    sound.currentTime = 0; // Reset sound to start
    sound.play().catch((err) => console.warn("Audio playback failed:", err));
  };

  // Modify handleKeyPress to include sound
  const handleKeyPress = (key: string) => {
    if (isCooldownActive.current || lastKeyPressed.current === key) return;

    playKeySound(key); // Add sound effect

    switch (key) {
      case "SPACE":
        outputTextRef.current += " ";
        break;
      case "BS":
        outputTextRef.current = outputTextRef.current.slice(0, -1);
        break;
      default:
        outputTextRef.current += key;
    }

    lastKeyPressed.current = key;
    isCooldownActive.current = true;

    setTimeout(() => {
      isCooldownActive.current = false;
      lastKeyPressed.current = null;
    }, COOLDOWN_TIME);
  };

  // Update the onResults function
  const onResults = (results: any) => {
    if (!canvasEl || !("current" in canvasEl) || !canvasEl.current) return;
    const canvasCtx = canvasEl.current.getContext("2d");
    if (!canvasCtx) return;
    if (!canvasCtx) return;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, maxVideoWidth, maxVideoHeight);

    // Mirror the canvas
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-maxVideoWidth, 0);

    canvasCtx.drawImage(results.image, 0, 0, maxVideoWidth, maxVideoHeight);

    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw hand connections
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00ffff",
          lineWidth: 2,
        });

        drawLandmarks(canvasCtx, landmarks, {
          color: "#ffff29",
          lineWidth: 1,
        });

        // Get index finger and thumb positions
        const indexTip = landmarks[INDEX_FINGER_TIP];
        const thumbTip = landmarks[THUMB_TIP];

        if (indexTip && thumbTip) {
          // Calculate pinch distance
          const pinchDistance = Math.sqrt(
            Math.pow(indexTip.x - thumbTip.x, 2) +
              Math.pow(indexTip.y - thumbTip.y, 2)
          );

          // Draw debug circles for finger positions
          canvasCtx.beginPath();
          canvasCtx.arc(
            indexTip.x * maxVideoWidth,
            indexTip.y * maxVideoHeight,
            5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle =
            pinchDistance < PINCH_THRESHOLD ? "red" : "green";
          canvasCtx.fill();

          canvasCtx.beginPath();
          canvasCtx.arc(
            thumbTip.x * maxVideoWidth,
            thumbTip.y * maxVideoHeight,
            5,
            0,
            2 * Math.PI
          );
          canvasCtx.fillStyle =
            pinchDistance < PINCH_THRESHOLD ? "red" : "green";
          canvasCtx.fill();

          // Draw line between fingers
          canvasCtx.beginPath();
          canvasCtx.moveTo(
            indexTip.x * maxVideoWidth,
            indexTip.y * maxVideoHeight
          );
          canvasCtx.lineTo(
            thumbTip.x * maxVideoWidth,
            thumbTip.y * maxVideoHeight
          );
          canvasCtx.strokeStyle =
            pinchDistance < PINCH_THRESHOLD ? "red" : "green";
          canvasCtx.lineWidth = 2;
          canvasCtx.stroke();

          // Detect key press on pinch
          if (pinchDistance < PINCH_THRESHOLD && !isCooldownActive.current) {
            const closestKey = detectClosestKey(
              indexTip.x,
              indexTip.y,
              maxVideoWidth,
              maxVideoHeight
            );
            if (closestKey) {
              handleKeyPress(closestKey);
            }
          }
        }
      }
    }

    canvasCtx.restore();

    // Draw keyboard and output text without mirroring
    drawKeyboard(canvasCtx, lastKeyPressed.current);
    drawOutputText(canvasCtx);
  };

  useEffect(() => {
    if (videoElement?.current && canvasEl?.current) {
      hands.current = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.current.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.current.onResults(onResults);

      camera.current = new Camera(videoElement.current, {
        onFrame: async () => {
          await hands.current.send({ image: videoElement.current });
        },
        width: maxVideoWidth,
        height: maxVideoHeight,
      });
      camera.current.start();
    }

    return () => {
      camera.current?.stop();
    };
  }, [videoElement, canvasEl]);

  return { maxVideoWidth, maxVideoHeight, outputText: outputTextRef.current };
}

export default useGestureRecognition;
