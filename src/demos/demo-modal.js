import { findDemoDef, mountPhoneDemo } from "./phone-embed";

export function initDemoModal(root = document) {
  if (typeof document === "undefined") return;
  if (document.querySelector(".demo-modal")) return;

  const hosts = [
    ...root.querySelectorAll(".project-card--demo .project-demo"),
    ...root.querySelectorAll(".timeline-demo[class*='-stage']"),
  ].filter((el, i, arr) => arr.indexOf(el) === i && findDemoDef(el));

  if (!hosts.length) return;

  const dialog = document.createElement("dialog");
  dialog.className = "demo-modal";
  dialog.setAttribute("aria-label", "Project demo");
  dialog.innerHTML = `
    <button type="button" class="demo-modal__close" aria-label="Close demo">
      <span aria-hidden="true">×</span>
    </button>
    <div class="demo-modal__stage"></div>
    <p class="demo-modal__caption">
      Simplified HTML walkthrough — not a screen recording
    </p>
  `;
  document.body.appendChild(dialog);

  const stage = dialog.querySelector(".demo-modal__stage");
  const closeBtn = dialog.querySelector(".demo-modal__close");
  let activeMount = null;
  let lastFocus = null;

  const close = () => {
    dialog.classList.remove("is-open");
    activeMount?.destroy?.();
    activeMount = null;
    stage.innerHTML = "";
    stage.className = "demo-modal__stage";
    stage.removeAttribute("style");
    if (dialog.open) dialog.close();
    document.body.classList.remove("demo-modal-open");
    lastFocus?.focus?.();
    lastFocus = null;
  };

  const openFromHost = (host) => {
    const def = findDemoDef(host);
    if (!def) return;

    lastFocus = document.activeElement;
    activeMount?.destroy?.();
    stage.innerHTML = "";
    stage.className = "demo-modal__stage";

    const nativeW = def.width || 375;
    const nativeH = def.height || 780;
    stage.style.setProperty("--phone-demo-native-w", String(nativeW));
    stage.style.setProperty("--phone-demo-native-h", String(nativeH));

    if (host.classList.contains("tablet-demo-stage")) {
      stage.classList.add("demo-modal__stage--tablet");
    } else if (host.classList.contains("desktop-demo-stage")) {
      stage.classList.add("demo-modal__stage--desktop");
    } else {
      stage.classList.add("demo-modal__stage--phone");
    }

    activeMount = mountPhoneDemo(stage, {
      ...def,
      mountedKey: "demoModalMounted",
      still: false,
      lazy: false,
    });

    document.body.classList.add("demo-modal-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    requestAnimationFrame(() => {
      dialog.classList.add("is-open");
      window.dispatchEvent(new Event("resize"));
    });

    closeBtn.focus();
  };

  closeBtn.addEventListener("click", close);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });

  hosts.forEach((host) => {
    host.classList.add("project-demo--expandable");

    const hit = document.createElement("button");
    hit.type = "button";
    hit.className = "project-demo-hit";
    hit.setAttribute(
      "aria-label",
      `Open larger demo: ${findDemoDef(host)?.title || "project"}`
    );
    host.appendChild(hit);
    hit.addEventListener("click", () => openFromHost(host));
  });
}
