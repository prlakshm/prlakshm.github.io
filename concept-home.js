// Match the homepage underline's spring and left-to-right draw.
for (const link of document.querySelectorAll(".concept-home")) {
  const rule = link.querySelector(".concept-home-rule");
  const update = () => {
    const scaleX = link.matches(":hover, :focus-visible") ? 1 : 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.Motion.animate(rule, { scaleX }, reduced
      ? { duration: 0 }
      : { type: "spring", stiffness: 420, damping: 30 });
  };
  for (const event of ["pointerenter", "pointerleave", "focusin", "focusout"]) {
    link.addEventListener(event, update);
  }
}
