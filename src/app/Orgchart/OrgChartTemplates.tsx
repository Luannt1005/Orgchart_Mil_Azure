"use client";

import OrgChart from "@/lib/orgchart";

export function patchOrgChartTemplates(enableEditFeatures = false) {
  if (typeof window === "undefined") return;

  // Constants for Move Buttons
  const MOVE_BUTTONS_SVG = `
    <!-- Move Left Button -->
    <g style="cursor:pointer;" data-move-btn="left" transform="translate(10, 345)">
        <circle cx="12" cy="12" r="12" fill="transparent" stroke="none" />
        <path d="M14 8 L8 12 L14 16" stroke="#6b7280" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>

    <!-- Move Right Button -->
    <g style="cursor:pointer;" data-move-btn="right" transform="translate(40, 345)">
        <circle cx="12" cy="12" r="12" fill="transparent" stroke="none" />
        <path d="M10 8 L16 12 L10 16" stroke="#6b7280" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;

  const GROUP_MOVE_BUTTONS_SVG = `
    <!-- Move Left Button -->
    <g style="cursor:pointer;" data-move-btn="left" transform="translate(10, 20)">
        <circle cx="12" cy="12" r="12" fill="transparent" stroke="none" />
        <path d="M14 8 L8 12 L14 16" stroke="#6b7280" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- Move Right Button -->
    <g style="cursor:pointer;" data-move-btn="right" transform="translate(40, 20)">
        <circle cx="12" cy="12" r="12" fill="transparent" stroke="none" />
        <path d="M10 8 L16 12 L10 16" stroke="#6b7280" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  `;

  // --- TEMPLATE BIG (Milwaukee Industrial Edition) ---
  OrgChart.templates.big = Object.assign({}, OrgChart.templates.ana);

  // Industrial Sharp Shadow
  OrgChart.templates.big.defs =
    `<filter x="-20%" y="-20%" width="140%" height="140%" id="mil-shadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
        <feOffset dx="0" dy="2" result="offsetblur" />
        <feComponentTransfer>
            <feFuncA type="linear" slope="0.2" />
        </feComponentTransfer>
        <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
        </feMerge>
    </filter>`;

  // OrgChart.templates.big.size = [230, 330];

  // Main Node Body: Solid White, Red Top Accent
  OrgChart.templates.big.size = [230, 380]; // 330 + 50

  // ------------------------------
  // Main Node Body
  // ------------------------------
  OrgChart.templates.big.node = `
<rect x="0" y="50" height="330" width="230"
      fill="white"
      stroke="#E5E7EB"
      stroke-width="1"
      rx="0" ry="0"
      filter="url(#mil-shadow)"></rect>

<rect x="0" y="50" height="10" width="230"
      fill="#DB011C"
      rx="0" ry="0"></rect>
`;

  if (enableEditFeatures) {
    OrgChart.templates.big.node += MOVE_BUTTONS_SVG;
  }

  // ------------------------------
  // Image
  // ------------------------------
  OrgChart.templates.big.img_0 = `
<clipPath id="{randId}">
  <rect x="45" y="85" width="140" height="170"
        rx="2" ry="2" fill="#ffffff"></rect>
</clipPath>

<image preserveAspectRatio="xMidYMid slice"
       clip-path="url(#{randId})"
       xlink:href="{val}"
       x="45" y="85"
       width="140" height="170"></image>

<rect x="45" y="85" width="140" height="170"
      rx="2" ry="2"
      fill="none"
      stroke="#DB011C"
      stroke-width="3"></rect>
`;

  // ------------------------------
  // Expand / Collapse Controls
  // ------------------------------
  OrgChart.templates.big.expandCollapseSize = 40;

  OrgChart.templates.big.minus = `
<rect x="15" y="15" height="24" width="24"
      fill="#000"
      rx="2" ry="2"></rect>
<line x1="20" y1="27" x2="34" y2="27"
      stroke="white"
      stroke-width="3" />
`;

  OrgChart.templates.big.plus = `
<rect x="15" y="15" height="24" width="24"
      fill="#DB011C"
      rx="2" ry="2"></rect>
<line x1="20" y1="27" x2="34" y2="27"
      stroke="white"
      stroke-width="3" />
<line x1="27" y1="20" x2="27" y2="34"
      stroke="white"
      stroke-width="3" />
`;

  // ------------------------------
  // Text Fields
  // ------------------------------
  OrgChart.templates.big.field_0 = `
<text data-width="210"
      x="115" y="295"
      text-anchor="middle"
      fill="#000"
      style="font-size:14px; font-weight:900; text-transform:uppercase;">
  {val}
</text>
`;

  OrgChart.templates.big.field_1 = `
<text data-width="210"
      x="115" y="320"
      text-anchor="middle"
      fill="#DB011C"
      style="font-size:12px; font-weight:700; text-transform:uppercase;">
  {val}
</text>
`;

  OrgChart.templates.big.link =
    '<path stroke-linejoin="round" stroke="var(--color-org-line)" stroke-width="2px" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';
  // ------------------------------
  // Hide "up" button
  // ------------------------------
  OrgChart.templates.big.up = "";

  // Custom Menu Button (3 dots) - Gray Color
  OrgChart.templates.big.nodeMenuButton = `
    <g style="cursor:pointer;" transform="matrix(1,0,0,1,200,345)" data-ctrl-menu="">
      <circle cx="12" cy="12" r="12" fill="transparent" />
      <circle cx="6" cy="12" r="2" fill="#6b7280" />
      <circle cx="12" cy="12" r="2" fill="#6b7280" />
      <circle cx="18" cy="12" r="2" fill="#6b7280" />
    </g>
  `;





  // --- GROUP TEMPLATE (Sector Header) ---
  // Initialize if not exists, or clone from ana
  if (!OrgChart.templates.group) {
    OrgChart.templates.group = Object.assign({}, OrgChart.templates.ana);
  }

  OrgChart.templates.group.size = [500, 60];
  OrgChart.templates.group.padding = [70, 10, 1, 10];

  OrgChart.templates.group.node =
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#000" stroke-width="4" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#000" stroke-width="4" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="8" width="{w}" fill="#DB011C"></rect>';

  if (enableEditFeatures) {
    OrgChart.templates.group.node += GROUP_MOVE_BUTTONS_SVG;
  }

  OrgChart.templates.group.field_0 = `
    <g transform="translate({cw}, 0)">
        <foreignObject x="-140" y="0" width="280" height="60">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width: 280px; height: 60px; display: flex; align-items: center; justify-content: center; text-align: center; white-space: normal; word-break: break-word; overflow: hidden;">
                <div style="font-size: 18px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.1; max-height: 55px; padding: 0 5px;">
                    {val}
                </div>
            </div>
        </foreignObject>
    </g>
  `;

  OrgChart.templates.group.link =
    '<path stroke-linejoin="round" stroke="var(--color-org-line)" stroke-width="2px" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';

  OrgChart.templates.group.nodeMenuButton = "";
  OrgChart.templates.group.up = '';
  OrgChart.templates.group.plus = '';
  OrgChart.templates.group.minus = '';











  // --- TEMPLATE BIG Probation (Milwaukee Industrial Edition) ---
  OrgChart.templates.big_v2 = Object.assign({}, OrgChart.templates.big);

  OrgChart.templates.big_v2.node = `
<rect x="0" y="50" height="330" width="230"
      fill="#82A762"
      stroke="#E5E7EB"
      stroke-width="1"
      rx="0" ry="0"
      filter="url(#mil-shadow)"></rect>

<rect x="0" y="50" height="10" width="230"
      fill="#DB011C"
      rx="0" ry="0"></rect>
`;

  if (enableEditFeatures) {
    OrgChart.templates.big_v2.node += MOVE_BUTTONS_SVG;
  }






  // --- TEMPLATE BIG Probation (Milwaukee Industrial Edition) ---
  OrgChart.templates.big_hc_open = Object.assign({}, OrgChart.templates.big);

  OrgChart.templates.big_hc_open.node = `
<rect x="0" y="50" height="330" width="230"
      fill="white"
      stroke="#E5E7EB"
      stroke-width="1"
      rx="0" ry="0"
      filter="url(#mil-shadow)"></rect>

<rect x="0" y="50" height="10" width="230"
      fill="#DB011C"
      rx="0" ry="0"></rect>
`;

  if (enableEditFeatures) {
    OrgChart.templates.big_hc_open.node += MOVE_BUTTONS_SVG;
  }



  // --- TEMPLATE BIG Inderct report group (Milwaukee Industrial Edition) ---
  OrgChart.templates.indirect_group = Object.assign({}, OrgChart.templates.group);

  OrgChart.templates.indirect_group.node =
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#1e90ff" stroke-width="4" stroke-dasharray="10" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#1e90ff" stroke-width="4" stroke-dasharray="10" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="8" width="{w}" fill="#DB011C"></rect>';

  if (enableEditFeatures) {
    OrgChart.templates.indirect_group.node += GROUP_MOVE_BUTTONS_SVG;
  }

  OrgChart.templates.indirect_group.link =
    '<path stroke-linejoin="round" stroke="#1e90ff" stroke-width="4px" stroke-dasharray="10" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';


  // --- TEMPLATE BIG TABLE (Description Table) ---
  OrgChart.templates.big_table = Object.assign({}, OrgChart.templates.big);
  OrgChart.templates.big_table.size = [300, 300];
  OrgChart.templates.big_table.img_0 = "";
  OrgChart.templates.big_table.field_0 = "";
  OrgChart.templates.big_table.field_1 = "";

  // Use dynamic width {w} and height {h}
  OrgChart.templates.big_table.node = `
  <rect x="0" y="0" height="{h}" width="{w}"
        fill="#ffffff"
        stroke="#E5E7EB"
        stroke-width="1"
        filter="url(#mil-shadow)"></rect>
  <rect x="0" y="0" height="10" width="{w}"
        fill="#DB011C" class="move-handle" style="cursor: move;"></rect>
  
  <!-- Resize Handle (Bottom-Right) -->
  <g class="resize-handle" style="cursor:nwse-resize" transform="translate({w}, {h})">
      <path d="M-15,0 L0,0 L0,-15 Z" fill="#999" opacity="0.5" />
      <line x1="-10" y1="-3" x2="-3" y2="-10" stroke="#fff" stroke-width="1" />
      <line x1="-6" y1="-3" x2="-3" y2="-6" stroke="#fff" stroke-width="1" />
  </g>
  `;

  if (enableEditFeatures) {
    // OrgChart.templates.big_table.node += MOVE_BUTTONS_SVG; // Disable standard move buttons
  }

  // The 'table' field will render the HTML content
  // We need to adjust foreignObject size too: width="{w}-20", height="{h}-30"
  // BUT standard templating might not support arithmetic in attributes directly unless using specific field mapping.
  // Balkan OrgChart templates typically use {val} or specific property names.
  // If {w} and {h} are available, we can try to use them or fixed offsets if SVG allows calc() (it doesn't easily in attributes).
  // A safe bet is using a slightly smaller inner container or assuming the foreignObject fills the space.
  // We will assume the user logic updates the 'width'/'height' of foreignObject if possible, 
  // OR we rely on standard box model. 
  // Let's try to use width="100%" height="100%" inside a transparent container? 
  // No, foreignObject needs explicit dimensions.
  // We'll update the nodeBinding to map 'width' and 'height' if needed, but 'w' and 'h' are internal.
  // Let's rely on the library filling {w} and {h}.
  // We might face an issue if we can't do math like {w}-20.
  // Workaround: We will use a large foreignObject with overflow hidden, or just set it to {w} and {h} and use padding in CSS.

  OrgChart.templates.big_table.table = `
    <foreignObject x="10" y="20" width="100%" height="100%" style="overflow: visible;">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:{w}px; height:{h}px; padding-right: 20px; padding-bottom: 20px; box-sizing: border-box;">
             <div style="width: 100%; height: 100%; overflow: auto;">
                {val}
             </div>
        </div>
    </foreignObject>
  `;
}