/**
 * Shared scaled iframe mount for interactive device demos.
 * Use data-demo-still for a frozen home screen (landing).
 * Omit it for autoplay when visible (experience / projects).
 *
 * Lazy: iframe src is set the first time the host nears the viewport,
 * then kept in memory. Off-screen demos are paused, not unloaded.
 */
export function mountPhoneDemo(
  host,
  {
    src,
    prefix,
    title,
    mountedKey = "phoneDemoMounted",
    width = 375,
    height = 780,
    still = false,
    lazy = true,
  }
) {
  if (!host || host.dataset[mountedKey] === "1") return null;

  const isStill =
    still ||
    host.hasAttribute("data-demo-still") ||
    host.dataset.demoStill === "1";

  const useLazy = lazy && !host.closest?.(".demo-modal");

  host.dataset[mountedKey] = "1";
  host.classList.add("phone-demo-stage", "phone-demo-embed");
  if (isStill) host.classList.add("phone-demo-stage--still");

  const scaler = document.createElement("div");
  scaler.className = "phone-demo-embed__scaler";
  scaler.style.width = `${width}px`;
  scaler.style.height = `${height}px`;

  const frame = document.createElement("iframe");
  frame.className = "phone-demo-embed__frame";
  frame.title = title;
  frame.loading = "lazy";
  frame.setAttribute("scrolling", "no");
  // allow-scripts only — pairing it with allow-same-origin lets the iframe
  // escape its sandbox (Chrome warns). Demos talk via postMessage.
  frame.setAttribute("sandbox", "allow-scripts allow-forms");
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;

  const params = new URLSearchParams({ embed: "1" });
  if (isStill) params.set("still", "1");
  const frameSrc = `${src}?${params.toString()}`;

  scaler.appendChild(frame);
  host.innerHTML = "";
  host.appendChild(scaler);

  let lastScale = -1;
  let ready = false;
  let wantPlay = false;
  let started = false;
  let io = null;

  const applyScale = () => {
    const w = host.clientWidth || width * 0.448;
    const scale = w / width;
    if (Math.abs(scale - lastScale) < 0.0005) return;
    lastScale = scale;
    scaler.style.transform = `scale(${scale})`;
  };

  applyScale();
  const onResize = () => {
    requestAnimationFrame(applyScale);
  };
  window.addEventListener("resize", onResize);

  const post = (type) => {
    if (!frame.contentWindow) return;
    frame.contentWindow.postMessage({ type }, "*");
  };

  const sync = () => {
    if (!ready || isStill || !started) return;
    post(wantPlay ? `${prefix}-play` : `${prefix}-pause`);
  };

  const onMessage = (event) => {
    if (event.source !== frame.contentWindow) return;
    if (event.data?.type === `${prefix}-ready`) {
      ready = true;
      sync();
    }
  };
  window.addEventListener("message", onMessage);

  frame.addEventListener("load", () => {
    if (!started) return;
    setTimeout(() => {
      ready = true;
      sync();
    }, 200);
  });

  const start = () => {
    if (started) return;
    started = true;
    frame.src = frameSrc;
    host.classList.add("is-demo-live");
    applyScale();
  };

  if (!useLazy) {
    start();
    if (!isStill) wantPlay = true;
  } else if (!isStill) {
    io = new IntersectionObserver(
      ([entry]) => {
        const near = !!entry?.isIntersecting;
        if (near) start();

        wantPlay = near && entry.intersectionRatio > 0.35;
        sync();
      },
      {
        threshold: [0, 0.35, 0.6],
        rootMargin: "180px 0px",
      }
    );
    io.observe(host);
  } else {
    // Still shots: load once when near, never autoplay.
    io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          start();
          io?.disconnect();
          io = null;
        }
      },
      { rootMargin: "200px 0px", threshold: 0 }
    );
    io.observe(host);
  }

  return {
    play: () => {
      if (isStill) return;
      start();
      wantPlay = true;
      sync();
    },
    pause: () => {
      wantPlay = false;
      sync();
    },
    destroy: () => {
      io?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("message", onMessage);
      host.innerHTML = "";
      delete host.dataset[mountedKey];
      host.classList.remove("is-demo-live");
    },
  };
}

const DEMO_DEFS = [
  {
    selector: "[data-takein-demo]",
    src: "/demos/takein.html",
    prefix: "takein",
    title: "TakeIN app preview",
    mountedKey: "takeinMounted",
  },
  {
    selector: "[data-truckup-demo]",
    src: "/demos/truckup.html",
    prefix: "truckup",
    title: "TruckUp Pro preview",
    mountedKey: "truckupMounted",
  },
  {
    selector: "[data-chargebeam-demo]",
    src: "/demos/chargebeam.html",
    prefix: "chargebeam",
    title: "Chargebeam preview",
    mountedKey: "chargebeamMounted",
  },
  {
    selector: "[data-cinolla-demo]",
    src: "/demos/cinolla.html",
    prefix: "cinolla",
    title: "Cinolla POS preview",
    mountedKey: "cinollaMounted",
    width: 980,
    height: 700,
  },
  {
    selector: "[data-openmundo-demo]",
    src: "/demos/openmundo.html",
    prefix: "openmundo",
    title: "Open Mundo preview",
    mountedKey: "openmundoMounted",
    width: 1020,
    height: 700,
  },
  {
    selector: "[data-openenglish-demo]",
    src: "/demos/openenglishjunior.html",
    prefix: "openenglish",
    title: "Open English Junior preview",
    mountedKey: "openenglishMounted",
    width: 1020,
    height: 700,
  },
  {
    selector: "[data-betterspace-demo]",
    src: "/demos/betterspace.html",
    prefix: "betterspace",
    title: "Betterspace management dashboard preview",
    mountedKey: "betterspaceMounted",
    width: 1280,
    height: 800,
  },
  {
    selector: "[data-stalmarck-demo]",
    src: "/demos/stalmarck.html",
    prefix: "stalmarck",
    title: "Stalmarck Homecare preview",
    mountedKey: "stalmarckMounted",
    width: 1280,
    height: 800,
  },
  {
    selector: "[data-lms160-demo]",
    src: "/demos/lms160.html",
    prefix: "lms160",
    title: "160 Driving Academy LMS preview",
    mountedKey: "lms160Mounted",
    width: 1180,
    height: 740,
  },
  {
    selector: "[data-truckers-demo]",
    src: "/demos/truckersnetwork.html",
    prefix: "truckers",
    title: "Truckers Network App preview",
    mountedKey: "truckersMounted",
    width: 390,
    height: 844,
  },
  {
    selector: "[data-truckersweb-demo]",
    src: "/demos/truckersnetworkweb.html",
    prefix: "truckersweb",
    title: "Truckers Network Web Suite preview",
    mountedKey: "truckerswebMounted",
    width: 1280,
    height: 800,
  },
  {
    selector: "[data-softmogul-demo]",
    src: "/demos/softmogulreception.html",
    prefix: "softmogul",
    title: "SoftMogul Reception preview",
    mountedKey: "softmogulMounted",
    width: 1020,
    height: 720,
  },
];

export function findDemoDef(host) {
  if (!host) return null;
  return DEMO_DEFS.find((def) => host.matches(def.selector)) || null;
}

export function mountAllPhoneDemos(root = document) {
  const mounts = [];
  DEMO_DEFS.forEach((def) => {
    root.querySelectorAll(def.selector).forEach((el) => {
      mounts.push(mountPhoneDemo(el, { ...def, lazy: true }));
    });
  });
  return mounts;
}
