"use client";

import OrgChart from "@/lib/orgchart";

export function patchOrgChartTemplates() {
  if (typeof window === "undefined") return;

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
    '<path stroke-linejoin="round" stroke="#000" stroke-width="2px" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';
  // ------------------------------
  // Hide "up" button
  // ------------------------------
  OrgChart.templates.big.up = "";





  // --- GROUP TEMPLATE (Sector Header) ---
  // Initialize if not exists, or clone from ana
  if (!OrgChart.templates.group) {
    OrgChart.templates.group = Object.assign({}, OrgChart.templates.ana);
  }

  OrgChart.templates.group.size = [500, 50];

  OrgChart.templates.group.node =
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#000" stroke-width="4" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="8" width="{w}" fill="#DB011C"></rect>';

  OrgChart.templates.group.field_0 =
    '<text data-width="480" style="font-size: 23px; font-weight: 1000; text-transform: uppercase;" fill="#000" x="{cw}" y="42" text-anchor="middle">{val}</text>';

  OrgChart.templates.group.link =
    '<path stroke-linejoin="round" stroke="#000" stroke-width="2px" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';

  OrgChart.templates.group.nodeMenuButton = '';
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






  // --- TEMPLATE BIG Inderct report group (Milwaukee Industrial Edition) ---
  OrgChart.templates.indirect_group = Object.assign({}, OrgChart.templates.group);

  OrgChart.templates.indirect_group.node =
    '<rect x="0" y="0" height="60" width="{w}" rx="0" ry="0" fill="#828282" stroke="#1e90ff" stroke-width="4" stroke-dasharray="10" filter="url(#mil-shadow)"></rect>' +
    '<rect x="0" y="0" height="8" width="{w}" fill="#DB011C"></rect>';


  OrgChart.templates.indirect_group.link =
    '<path stroke-linejoin="round" stroke="#1e90ff" stroke-width="4px" stroke-dasharray="10" fill="none" d="M{xa},{ya} {xb},{yb} {xc},{yc} L{xd},{yd}" />';
}



