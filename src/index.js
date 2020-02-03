import createCamera from "camera-2d-simple";
import { vec2 } from "gl-matrix";

const dom2dCamera = (
  element,
  {
    distance = 1.0,
    target = [0, 0],
    rotation = 0,
    isNdc = true,
    isFixed = false,
    isPan = true,
    panSpeed = 1,
    isRotate = true,
    rotateSpeed = 1,
    isZoom = true,
    zoomSpeed = 1
  } = {}
) => {
  let camera = createCamera(target, distance, rotation);
  let isChanged = false;
  let mouseX = 0;
  let mouseY = 0;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let isLeftMousePressed = false;
  let yScroll = 0;

  let { width, height } = element.getBoundingClientRect();
  let aspectRatio = width / height;
  let isAlt = false;

  const transformPanX = isNdc
    ? dX => (dX / width) * 2 * aspectRatio // to normalized device coords
    : dX => dX;
  const transformPanY = isNdc
    ? dY => (dY / height) * 2 // to normalized device coords
    : dY => -dY;

  const transformScaleX = isNdc
    ? x => (-1 + (x / width) * 2) * aspectRatio // to normalized device coords
    : x => x;
  const transformScaleY = isNdc
    ? y => 1 - (y / height) * 2 // to normalized device coords
    : y => y;

  const tick = () => {
    if (isFixed) return false;

    isChanged = false;

    if (isPan && isLeftMousePressed && !isAlt) {
      // To pan 1:1 we need to half the width and height because the uniform
      // coordinate system goes from -1 to 1.
      camera.pan([
        transformPanX(panSpeed * (mouseX - prevMouseX)),
        transformPanY(panSpeed * (prevMouseY - mouseY))
      ]);
      isChanged = true;
    }

    if (isZoom && yScroll) {
      const dZ = zoomSpeed * Math.exp(yScroll / height);

      // Get normalized device coordinates (NDC)
      const transformedX = transformScaleX(mouseX);
      const transformedY = transformScaleY(mouseY);

      camera.scale(1 / dZ, [transformedX, transformedY]);

      isChanged = true;
    }

    if (isRotate && isLeftMousePressed && isAlt) {
      const wh = width / 2;
      const hh = height / 2;
      const x1 = prevMouseX - wh;
      const y1 = hh - prevMouseY;
      const x2 = mouseX - wh;
      const y2 = hh - mouseY;
      // Angle between the start and end mouse position with respect to the
      // viewport center
      const radians = vec2.angle([x1, y1], [x2, y2]);
      // Determine the orientation
      const cross = x1 * y2 - x2 * y1;

      camera.rotate(rotateSpeed * radians * Math.sign(cross));

      isChanged = true;
    }

    // Reset scroll delta and mouse position
    yScroll = 0;
    prevMouseX = mouseX;
    prevMouseY = mouseY;

    return isChanged;
  };

  const config = ({
    isFixed: newIsFixed = null,
    isPan: newIsPan = null,
    isRotate: newIsRotate = null,
    isZoom: newIsZoom = null,
    panSpeed: newPanSpeed = null,
    rotateSpeed: newRotateSpeed = null,
    zoomSpeed: newZoomSpeed = null
  } = {}) => {
    isFixed = newIsFixed !== null ? newIsFixed : isFixed;
    isPan = newIsPan !== null ? newIsPan : isPan;
    isRotate = newIsRotate !== null ? newIsRotate : isRotate;
    isZoom = newIsZoom !== null ? newIsZoom : isZoom;
    panSpeed = +newPanSpeed > 0 ? newPanSpeed : panSpeed;
    rotateSpeed = +newRotateSpeed > 0 ? newRotateSpeed : rotateSpeed;
    zoomSpeed = +newZoomSpeed > 0 ? newZoomSpeed : zoomSpeed;
  };

  const refresh = () => {
    const bBox = element.getBoundingClientRect();
    height = bBox.height;
    width = bBox.width;
    aspectRatio = width / height;
  };

  const keyUpHandler = () => {
    isAlt = false;
  };

  const keyDownHandler = event => {
    isAlt = event.altKey;
    console.log("IS ALT?", isAlt, event.altKey);
  };

  const mouseUpHandler = () => {
    isLeftMousePressed = false;
  };

  const mouseDownHandler = event => {
    isLeftMousePressed = event.buttons === 1;
  };

  const mouseMoveHandler = event => {
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;
  };

  const wheelHandler = event => {
    const scale = event.deltaMode === 1 ? 12 : 1;

    yScroll += scale * (event.deltaY || 0);

    event.preventDefault();
  };

  const dispose = () => {
    camera = undefined;
    window.removeEventListener("keydown", keyDownHandler);
    window.removeEventListener("keyup", keyUpHandler);
    element.removeEventListener("mousedown", mouseDownHandler);
    window.removeEventListener("mouseup", mouseUpHandler);
    window.removeEventListener("mousemove", mouseMoveHandler);
    element.removeEventListener("wheel", wheelHandler);
  };

  window.addEventListener("keydown", keyDownHandler, false);
  window.addEventListener("keyup", keyUpHandler, false);
  element.addEventListener("mousedown", mouseDownHandler, false);
  window.addEventListener("mouseup", mouseUpHandler, false);
  window.addEventListener("mousemove", mouseMoveHandler, false);
  element.addEventListener("wheel", wheelHandler, false);

  camera.config = config;
  camera.dispose = dispose;
  camera.refresh = refresh;
  camera.tick = tick;

  return camera;
};

export default dom2dCamera;
