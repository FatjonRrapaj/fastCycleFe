/** Static sketch mark for inner-page footers — echoes the home drone story. */
const FOOTER_SKETCH = `
<svg class="footer-mark__svg" viewBox="0 0 800 796" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M412 399.5V0" stroke="currentColor" stroke-width="1.5"/>
  <path d="M411 399H800" stroke="currentColor" stroke-width="1.5"/>
  <path d="M411 398L695 683" stroke="currentColor" stroke-width="1.5"/>
  <path d="M412 398V796" stroke="currentColor" stroke-width="1.5"/>
  <path d="M412 399L129 683" stroke="currentColor" stroke-width="1.5"/>
  <path d="M413 399H0" stroke="currentColor" stroke-width="1.5"/>
  <path d="M412.5 399.5L130 118" stroke="currentColor" stroke-width="1.5"/>
  <path d="M411 400L694 116" stroke="currentColor" stroke-width="1.5"/>
  <rect x="178.5" y="208.5" width="466" height="384" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="230" cy="225" r="16.5" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="594" cy="225" r="16.5" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="628" cy="576" r="16.5" stroke="currentColor" stroke-width="1.5"/>
  <circle cx="195" cy="576" r="16.5" stroke="currentColor" stroke-width="1.5"/>
  <rect x="340.5" y="260.5" width="144" height="223" rx="19.5" stroke="currentColor" stroke-width="1.5"/>
  <path stroke="currentColor" stroke-width="1.5" d="M299.5 684L308 676L258 615L220.5 586.5C227.166 581.667 239.2 568.1 234 552.5C269 519 339.4 452 341 452L347.5 479L353 483L471 482.5C473.666 482 479.2 479.5 480 473.5L484.5 453.5L590 552C587 559.5 585.4 576.7 603 585.5L565 611.5L513 673L520.5 681.5L583.5 636L622 591.5C631.166 593.667 648.4 591.9 644 567.5L689 535L736.5 470.5L728.5 462L663 508.5L634.5 548.5C631.333 545.333 626 539.5 621.5 538.5C616.798 537.455 611.666 537.333 611 537L493.5 425C490.5 421.5 484.5 414.1 484.5 412.5V355.5L493 344.5L577.5 263C584.333 263.5 599.5 261.4 605.5 249L636.5 285L700.5 331.5L707.5 323.5L656 263L610 229.5C611.333 220.5 608.4 204 586 210L553 164L488.5 117.5L480.5 125.5L528.5 190.5L565.5 217.5C561.333 221.167 553.9 232.3 557.5 247.5L490.5 310.5L484.5 314.5V285.5L474.5 265.5C473.166 263.833 469.9 260.5 467.5 260.5H359L353.5 263.5L342 283.5V315.5C337.333 312.5 326.8 305.2 322 300L265.5 247.5C267.5 240 268.4 223.4 256 217L292.5 187.5L337.5 121.5L330 113L268.5 162L236.5 209.5C228.166 206.833 211.7 207.4 212.5 231L167.5 265.5L119 327L126 335.5L187.5 288.5L218 250C223.5 255.333 236.5 265.2 244.5 262L330 343C334 347.167 342 356.7 342 361.5C342 366.3 342 395.5 342 409.5C336 416.667 322.8 432.1 318 436.5C313.2 440.9 245.667 505.667 212.5 537.5C207 537.833 194.4 540.6 188 549L157.5 512.5L90.5 468L83 475.5L131 536.5L180 568.5C178 577.5 179.3 594.5 200.5 590.5L236 635L299 684"/>
</svg>
`.trim();

export function mountFooterMark() {
  document.querySelectorAll(".site-footer").forEach((footer) => {
    if (footer.dataset.markMounted === "1") return;
    footer.dataset.markMounted = "1";
    footer.classList.add("site-footer--mark");

    const mark = document.createElement("a");
    mark.className = "footer-mark";
    mark.href = "/";
    mark.setAttribute("aria-label", "Back to home");
    mark.innerHTML = FOOTER_SKETCH;

    const copy = document.createElement("div");
    copy.className = "site-footer__copy";
    while (footer.firstChild) copy.appendChild(footer.firstChild);

    footer.append(mark, copy);
  });
}
