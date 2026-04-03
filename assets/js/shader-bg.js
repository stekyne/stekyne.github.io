(function () {
  "use strict";

  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var gl =
    canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    canvas.style.display = "none";
    return;
  }

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  var mouse = { x: 0.5, y: 0.5 };
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  // --- Shaders ---

  var vertSrc = [
    "attribute vec2 a_position;",
    "void main() {",
    "  gl_Position = vec4(a_position, 0.0, 1.0);",
    "}",
  ].join("\n");

  var fragSrc = [
    "precision highp float;",
    "uniform vec2 u_resolution;",
    "uniform float u_time;",
    "uniform vec2 u_mouse;",
    "",
    "// Simplex 2D noise",
    "vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }",
    "vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }",
    "vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }",
    "",
    "float snoise(vec2 v) {",
    "  const vec4 C = vec4(0.211324865405187, 0.366025403784439,",
    "                      -0.577350269189626, 0.024390243902439);",
    "  vec2 i = floor(v + dot(v, C.yy));",
    "  vec2 x0 = v - i + dot(i, C.xx);",
    "  vec2 i1;",
    "  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);",
    "  vec4 x12 = x0.xyxy + C.xxzz;",
    "  x12.xy -= i1;",
    "  i = mod289(i);",
    "  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))",
    "           + i.x + vec3(0.0, i1.x, 1.0));",
    "  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),",
    "               dot(x12.zw,x12.zw)), 0.0);",
    "  m = m*m;",
    "  m = m*m;",
    "  vec3 x = 2.0 * fract(p * C.www) - 1.0;",
    "  vec3 h = abs(x) - 0.5;",
    "  vec3 ox = floor(x + 0.5);",
    "  vec3 a0 = x - ox;",
    "  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);",
    "  vec3 g;",
    "  g.x = a0.x * x0.x + h.x * x0.y;",
    "  g.yz = a0.yz * x12.xz + h.yz * x12.yw;",
    "  return 130.0 * dot(m, g);",
    "}",
    "",
    "float fbm(vec2 p) {",
    "  float val = 0.0;",
    "  float amp = 0.5;",
    "  float freq = 1.0;",
    "  for (int i = 0; i < 5; i++) {",
    "    val += amp * snoise(p * freq);",
    "    freq *= 2.0;",
    "    amp *= 0.5;",
    "  }",
    "  return val;",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_resolution;",
    "  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);",
    "  vec2 p = uv * aspect;",
    "",
    "  // Mouse influence — subtle offset",
    "  vec2 mouseOffset = (u_mouse - 0.5) * 0.15;",
    "",
    "  // Slow time drift",
    "  float t = u_time * 0.04;",
    "",
    "  // Multi-layer noise for rich contour field",
    "  float n1 = fbm(p * 1.8 + vec2(t, t * 0.7) + mouseOffset);",
    "  float n2 = fbm(p * 3.2 + vec2(-t * 0.5, t * 0.3) + mouseOffset * 0.5);",
    "  float n = n1 * 0.65 + n2 * 0.35;",
    "",
    "  // Generate contour lines using fract",
    "  float contourFreq = 8.0;",
    "  float contourVal = fract(n * contourFreq);",
    "",
    "  // Create thin lines at contour edges",
    "  float lineWidth = 0.04;",
    "  float line = 1.0 - smoothstep(0.0, lineWidth, contourVal)",
    "             + smoothstep(1.0 - lineWidth, 1.0, contourVal);",
    "",
    "  // Secondary finer contours",
    "  float contourVal2 = fract(n * contourFreq * 2.0);",
    "  float line2 = 1.0 - smoothstep(0.0, lineWidth * 0.5, contourVal2)",
    "              + smoothstep(1.0 - lineWidth * 0.5, 1.0, contourVal2);",
    "",
    "  // Combine: primary lines stronger, secondary subtle",
    "  float finalLine = line * 0.10 + line2 * 0.03;",
    "",
    "  // Slight accent tint on primary lines",
    "  vec3 lineColor = mix(vec3(1.0), vec3(0.0, 0.83, 1.0), 0.15);",
    "",
    "  // Vignette — darken edges",
    "  float vignette = 1.0 - length((uv - 0.5) * 1.3);",
    "  vignette = smoothstep(0.0, 0.7, vignette);",
    "",
    "  vec3 color = lineColor * finalLine * vignette;",
    "",
    "  gl_FragColor = vec4(color, 1.0);",
    "}",
  ].join("\n");

  // --- Compile shaders ---

  function createShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var vert = createShader(gl.VERTEX_SHADER, vertSrc);
  var frag = createShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) {
    canvas.style.display = "none";
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    canvas.style.display = "none";
    return;
  }

  gl.useProgram(program);

  // --- Geometry: full-screen quad ---

  var posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  var aPos = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // --- Uniforms ---

  var uResolution = gl.getUniformLocation(program, "u_resolution");
  var uTime = gl.getUniformLocation(program, "u_time");
  var uMouse = gl.getUniformLocation(program, "u_mouse");

  // --- Sizing ---

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener("resize", resize);

  // --- Mouse tracking ---

  document.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = 1.0 - e.clientY / window.innerHeight;
  });

  // --- Render loop ---

  var startTime = performance.now();
  var running = true;

  function render() {
    if (!running) return;

    var elapsed = (performance.now() - startTime) / 1000.0;
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, elapsed);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!prefersReduced) {
      requestAnimationFrame(render);
    }
  }

  // Pause when tab hidden
  var pausedAt = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      running = false;
      pausedAt = performance.now();
    } else {
      running = true;
      startTime += performance.now() - pausedAt;
      if (!prefersReduced) {
        requestAnimationFrame(render);
      }
    }
  });

  render();
})();
