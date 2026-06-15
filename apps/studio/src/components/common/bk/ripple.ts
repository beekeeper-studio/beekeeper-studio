// Material-style click ripple, ported from xel's x-button pointerdown effect.
// Spawns a ripple element inside `container`, scales it in on press and fades it
// out on release. `host` is the element that owns the pointer interaction.

const easing = "cubic-bezier(0.4, 0, 0.2, 1)";

export function spawnRipple(
  container: HTMLElement | null,
  host: HTMLElement,
  event: PointerEvent,
  unbounded = false
): void {
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.5;
  const top = event.clientY - rect.y - size / 2;
  const left = event.clientX - rect.x - size / 2;

  const ripple = document.createElement("div");
  ripple.className = "ripple";
  ripple.setAttribute(
    "style",
    `width: ${size}px; height: ${size}px; top: ${top}px; left: ${left}px;`
  );

  container.append(ripple);
  container.style.contain = unbounded ? "none" : "strict";

  const inAnimation = ripple.animate(
    { transform: ["scale3d(0, 0, 0)", "none"] },
    { duration: 300, easing }
  );

  let released = false;
  const finish = async () => {
    if (released) return;
    released = true;
    try {
      await inAnimation.finished;
      const outAnimation = ripple.animate(
        { opacity: [getComputedStyle(ripple).opacity || "0", "0"] },
        { duration: 300, easing }
      );
      await outAnimation.finished;
    } catch {
      // Animation may be cancelled if the element is removed mid-flight.
    }
    ripple.remove();
  };

  window.addEventListener("pointerup", finish, { once: true });
  window.addEventListener("pointercancel", finish, { once: true });
}
