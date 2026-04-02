const revealItems = document.querySelectorAll("[data-reveal]");
const globeCanvas = document.getElementById("globeCanvas");
const bgMatrix = document.getElementById("bgMatrix");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const formEndpoint = window.SITE_CONFIG?.formEndpoint || "";
const fallbackEmail = window.SITE_CONFIG?.fallbackEmail || "contact@example.com";

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

revealItems.forEach((item) => observer.observe(item));

const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  nx: 0,
  ny: 0,
  active: false
};

function createBackgroundMatrix() {
  if (!bgMatrix) return;

  const ctx = bgMatrix.getContext("2d");
  const particles = [];
  const count = 150;

  function resize() {
    bgMatrix.width = window.innerWidth;
    bgMatrix.height = window.innerHeight;
  }

  function seed() {
    particles.length = 0;
    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * bgMatrix.width,
        y: Math.random() * bgMatrix.height,
        ox: Math.random() * bgMatrix.width,
        oy: Math.random() * bgMatrix.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.35 + 0.12
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, bgMatrix.width, bgMatrix.height);

    particles.forEach((particle) => {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const distance = Math.hypot(dx, dy) || 1;

      if (pointer.active && distance < 180) {
        const force = (180 - distance) / 180;
        const angle = Math.atan2(dy, dx);
        particle.vx += Math.cos(angle) * force * 0.7;
        particle.vy += Math.sin(angle) * force * 0.7;
      }

      particle.vx += (particle.ox - particle.x) * 0.0008;
      particle.vy += (particle.oy - particle.y) * 0.0008;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.x += particle.vx;
      particle.y += particle.vy;

      ctx.beginPath();
      ctx.fillStyle = `rgba(121, 242, 255, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);

        if (distance < 120) {
          ctx.strokeStyle = `rgba(121, 242, 255, ${0.1 - distance / 1400})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  seed();
  draw();

  window.addEventListener("resize", () => {
    resize();
    seed();
  });
}

function createGlobe() {
  if (!globeCanvas) return;

  const ctx = globeCanvas.getContext("2d");
  const globe = {
    width: 720,
    height: 720,
    radius: 220,
    rotationY: 0,
    rotationX: 0.55
  };

  const regionCenters = [
    { name: "North America", lat: 40, lon: -100, color: "cyan" },
    { name: "South America", lat: -15, lon: -60, color: "cyan" },
    { name: "Europe", lat: 50, lon: 10, color: "gold" },
    { name: "Africa", lat: 5, lon: 20, color: "cyan" },
    { name: "Middle East", lat: 28, lon: 45, color: "gold" },
    { name: "Asia", lat: 35, lon: 105, color: "cyan" },
    { name: "Southeast Asia", lat: 10, lon: 110, color: "cyan" },
    { name: "Australia", lat: -25, lon: 135, color: "gold" }
  ];

  const continentBlobs = [
    { lat: 48, lon: -105, rx: 38, ry: 24, color: "rgba(121,242,255,0.12)" },
    { lat: -15, lon: -60, rx: 18, ry: 26, color: "rgba(121,242,255,0.08)" },
    { lat: 52, lon: 10, rx: 18, ry: 14, color: "rgba(255,216,123,0.12)" },
    { lat: 6, lon: 20, rx: 18, ry: 24, color: "rgba(121,242,255,0.08)" },
    { lat: 30, lon: 85, rx: 44, ry: 24, color: "rgba(121,242,255,0.10)" },
    { lat: -24, lon: 135, rx: 14, ry: 10, color: "rgba(255,216,123,0.10)" }
  ];

  const nodes = [];
  const routes = [];
  const pulses = [];

  function resize() {
    const size = window.innerWidth < 860 ? 440 : 720;
    globeCanvas.width = size * window.devicePixelRatio;
    globeCanvas.height = size * window.devicePixelRatio;
    globeCanvas.style.width = `${size}px`;
    globeCanvas.style.height = `${size}px`;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    globe.width = size;
    globe.height = size;
    globe.radius = size * 0.305;
  }

  function toSphere(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return { phi, theta };
  }

  function randomAround(centerLat, centerLon, spreadLat, spreadLon) {
    return {
      lat: centerLat + (Math.random() - 0.5) * spreadLat,
      lon: centerLon + (Math.random() - 0.5) * spreadLon
    };
  }

  function seedNodes() {
    nodes.length = 0;
    routes.length = 0;
    pulses.length = 0;

    const clusters = [
      { lat: 45, lon: -100, spreadLat: 22, spreadLon: 34, count: 22, color: "cyan" },
      { lat: -15, lon: -60, spreadLat: 18, spreadLon: 18, count: 10, color: "cyan" },
      { lat: 50, lon: 10, spreadLat: 18, spreadLon: 26, count: 20, color: "gold" },
      { lat: 5, lon: 20, spreadLat: 22, spreadLon: 22, count: 12, color: "cyan" },
      { lat: 28, lon: 45, spreadLat: 16, spreadLon: 18, count: 10, color: "gold" },
      { lat: 35, lon: 105, spreadLat: 24, spreadLon: 34, count: 20, color: "cyan" },
      { lat: 10, lon: 110, spreadLat: 18, spreadLon: 18, count: 10, color: "cyan" },
      { lat: -25, lon: 135, spreadLat: 14, spreadLon: 18, count: 8, color: "gold" }
    ];

    clusters.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i += 1) {
        const point = randomAround(cluster.lat, cluster.lon, cluster.spreadLat, cluster.spreadLon);
        const sphere = toSphere(point.lat, point.lon);
        nodes.push({
          ...sphere,
          pulse: Math.random() * Math.PI * 2,
          drift: 0.0008 + Math.random() * 0.0014,
          color: cluster.color
        });
      }
    });

    for (let i = 0; i < regionCenters.length; i += 1) {
      for (let j = i + 1; j < regionCenters.length; j += 1) {
        if (Math.random() > 0.35) {
          routes.push({
            from: i,
            to: j,
            speed: 0.003 + Math.random() * 0.004
          });
        }
      }
    }

    for (let i = 0; i < 18; i += 1) {
      pulses.push({
        routeIndex: Math.floor(Math.random() * Math.max(routes.length, 1)),
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.006
      });
    }
  }

  function project(theta, phi, rotationY, rotationX) {
    const sinPhi = Math.sin(phi);
    let x = globe.radius * sinPhi * Math.cos(theta);
    let y = globe.radius * Math.cos(phi);
    let z = globe.radius * sinPhi * Math.sin(theta);

    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const rx = x * cosY - z * sinY;
    const rz = x * sinY + z * cosY;
    x = rx;
    z = rz;

    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const ry = y * cosX - z * sinX;
    const rz2 = y * sinX + z * cosX;
    y = ry;
    z = rz2;

    const scale = 0.72 + ((z + globe.radius) / (globe.radius * 2)) * 0.68;

    return {
      x: globe.width / 2 + x * scale,
      y: globe.height / 2 + y * scale,
      z,
      scale
    };
  }

  function drawRoute(a, b, alpha) {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2 - Math.hypot(a.x - b.x, a.y - b.y) * 0.18;

    ctx.strokeStyle = `rgba(121, 242, 255, ${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(midX, midY, b.x, b.y);
    ctx.stroke();

    return { midX, midY };
  }

  function drawBlob(blob, rotationY, rotationX) {
    const points = [];
    for (let i = 0; i <= 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2;
      const lat = blob.lat + Math.sin(angle) * blob.ry;
      const lon = blob.lon + Math.cos(angle) * blob.rx;
      const sphere = toSphere(lat, lon);
      points.push(project(sphere.theta, sphere.phi, rotationY, rotationX));
    }

    const visible = points.filter((point) => point.z > -globe.radius * 0.35);
    if (visible.length < 8) return;

    ctx.fillStyle = blob.color;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, globe.width, globe.height);

    globe.rotationY += 0.0032;
    globe.rotationX += (pointer.ny * 0.35 - globe.rotationX + 0.55) * 0.015;
    const rotationY = globe.rotationY + pointer.nx * 0.85;

    const centerGlow = ctx.createRadialGradient(
      globe.width / 2,
      globe.height / 2,
      globe.radius * 0.15,
      globe.width / 2,
      globe.height / 2,
      globe.radius * 1.28
    );
    centerGlow.addColorStop(0, "rgba(121, 242, 255, 0.18)");
    centerGlow.addColorStop(1, "rgba(121, 242, 255, 0)");
    ctx.fillStyle = centerGlow;
    ctx.beginPath();
    ctx.arc(globe.width / 2, globe.height / 2, globe.radius * 1.34, 0, Math.PI * 2);
    ctx.fill();

    continentBlobs.forEach((blob) => drawBlob(blob, rotationY, globe.rotationX));

    ctx.strokeStyle = "rgba(121, 242, 255, 0.11)";
    ctx.lineWidth = 1;
    for (let lat = -5; lat <= 5; lat += 1) {
      ctx.beginPath();
      for (let i = 0; i <= 72; i += 1) {
        const theta = (i / 72) * Math.PI * 2;
        const phi = Math.PI / 2 + lat * 0.18;
        const point = project(theta, phi, rotationY, globe.rotationX);
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    for (let lon = 0; lon < 10; lon += 1) {
      ctx.beginPath();
      for (let i = 0; i <= 72; i += 1) {
        const theta = (lon / 10) * Math.PI * 2;
        const phi = (i / 72) * Math.PI;
        const point = project(theta, phi, rotationY, globe.rotationX);
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    const projectedCenters = regionCenters.map((center) => {
      const sphere = toSphere(center.lat, center.lon);
      return {
        ...project(sphere.theta, sphere.phi, rotationY, globe.rotationX),
        color: center.color
      };
    });

    const projectedNodes = nodes.map((node) => {
      node.theta += node.drift;
      node.pulse += 0.04;
      return {
        ...project(node.theta, node.phi, rotationY, globe.rotationX),
        pulse: node.pulse,
        color: node.color
      };
    });

    projectedNodes.forEach((nodeA, i) => {
      for (let j = i + 1; j < projectedNodes.length; j += 1) {
        const nodeB = projectedNodes[j];
        const distance = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
        if (distance < globe.radius * 0.22 && nodeA.z > -globe.radius * 0.25 && nodeB.z > -globe.radius * 0.25) {
          ctx.strokeStyle = `rgba(121, 242, 255, ${0.12 - distance / 1200})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodeA.x, nodeA.y);
          ctx.lineTo(nodeB.x, nodeB.y);
          ctx.stroke();
        }
      }
    });

    routes.forEach((route, routeIndex) => {
      const from = projectedCenters[route.from];
      const to = projectedCenters[route.to];
      if (!from || !to) return;
      if (from.z < -globe.radius * 0.4 && to.z < -globe.radius * 0.4) return;

      const { midX, midY } = drawRoute(from, to, 0.16);

      pulses.forEach((pulse) => {
        if (pulse.routeIndex !== routeIndex) return;
        pulse.t += pulse.speed;
        if (pulse.t > 1) pulse.t = 0;

        const x =
          (1 - pulse.t) * (1 - pulse.t) * from.x +
          2 * (1 - pulse.t) * pulse.t * midX +
          pulse.t * pulse.t * to.x;
        const y =
          (1 - pulse.t) * (1 - pulse.t) * from.y +
          2 * (1 - pulse.t) * pulse.t * midY +
          pulse.t * pulse.t * to.y;

        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 216, 123, 0.92)";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(255, 216, 123, 0.92)";
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    });

    projectedCenters.forEach((hub) => {
      const color = hub.color === "gold" ? "rgba(255, 216, 123, 0.95)" : "rgba(121, 242, 255, 0.95)";
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowBlur = 24;
      ctx.shadowColor = color;
      ctx.arc(hub.x, hub.y, 4.5 + hub.scale * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    projectedNodes
      .sort((a, b) => a.z - b.z)
      .forEach((node, index) => {
        const alpha = 0.26 + ((node.z + globe.radius) / (globe.radius * 2)) * 0.78;
        const radius = 1.4 + node.scale * 1.8 + Math.sin(node.pulse) * 0.55;
        const color = node.color === "gold"
          ? `rgba(255, 216, 123, ${alpha})`
          : `rgba(121, 242, 255, ${alpha})`;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowBlur = index % 10 === 0 ? 16 : 10;
        ctx.shadowColor = color;
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

    requestAnimationFrame(draw);
  }

  resize();
  seedNodes();
  draw();
  window.addEventListener("resize", resize);
}

createBackgroundMatrix();
createGlobe();

window.addEventListener("pointermove", (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.nx = (event.clientX / window.innerWidth) - 0.5;
  pointer.ny = (event.clientY / window.innerHeight) - 0.5;
  pointer.active = true;
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
});

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const payload = Object.fromEntries(formData.entries());

    if (!formEndpoint) {
      const subject = encodeURIComponent(`Pentest-Anfrage von ${payload.company}`);
      const body = encodeURIComponent(
        [
          `Unternehmen: ${payload.company}`,
          `Ansprechpartner: ${payload.name}`,
          `E-Mail: ${payload.email}`,
          `Service: ${payload.service}`,
          "",
          "Projektbeschreibung:",
          payload.message
        ].join("\n")
      );

      formStatus.textContent = "Kein Endpoint gesetzt. Es wird dein Mailprogramm geöffnet.";
      window.location.href = `mailto:${fallbackEmail}?subject=${subject}&body=${body}`;
      return;
    }

    formStatus.textContent = "Anfrage wird sicher übertragen...";

    try {
      const response = await fetch(formEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      contactForm.reset();
      formStatus.textContent = "Danke. Ihre Anfrage wurde erfolgreich übermittelt.";
    } catch (error) {
      formStatus.textContent = "Die Anfrage konnte gerade nicht gesendet werden. Bitte Endpoint oder Netzwerk prüfen.";
    }
  });
}
