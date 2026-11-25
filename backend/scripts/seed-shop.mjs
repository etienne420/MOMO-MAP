#!/usr/bin/env node
// seed-shop.mjs
// Remplit la boutique : 6 thèmes (20 jetons) et 14 avatars SVG (5 jetons).
//
// Usage :
//   cd backend
//   node scripts/seed-shop.mjs
//
// Les images sont des data-URI SVG : aucun service externe (Cloudinary) n'est requis.
// Le script est idempotent : il met à jour l'élément existant (même « nom ») au lieu de le dupliquer.

import "dotenv/config";
import mongoose from "mongoose";
import Theme from "../models/theme.js";
import Avatar from "../models/avatar.js";

const THEME_PRICE = 20;
const AVATAR_PRICE = 5;

function svgDataUri(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Aperçu de la palette d'un thème (mini plan stylisé).
function themeThumb({ ground, blocks, roads, outline, green, primary }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="288" viewBox="0 0 512 288">
<rect width="512" height="288" fill="${ground}"/>
<rect x="32" y="32" width="196" height="96" rx="12" fill="${blocks}"/>
<rect x="252" y="32" width="228" height="96" rx="12" fill="${blocks}"/>
<rect x="32" y="168" width="132" height="88" rx="12" fill="${green}"/>
<rect x="188" y="168" width="292" height="88" rx="12" fill="${blocks}"/>
<path d="M0 146 H512" stroke="${roads}" stroke-width="14"/>
<path d="M0 146 H512" stroke="${outline}" stroke-width="2" opacity="0.6"/>
<rect x="392" y="112" width="72" height="72" rx="18" fill="${primary}"/>
</svg>`;
  return svgDataUri(svg);
}

// Mascotte « Momo » déclinée en plusieurs coloris.
function avatarSvg({ bg, body, accent }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
<rect width="256" height="256" rx="52" fill="${bg}"/>
<circle cx="128" cy="22" r="9" fill="${accent}"/>
<rect x="124" y="24" width="8" height="24" rx="4" fill="${accent}"/>
<circle cx="128" cy="112" r="66" fill="${body}"/>
<circle cx="104" cy="104" r="11" fill="#0f172a"/>
<circle cx="152" cy="104" r="11" fill="#0f172a"/>
<circle cx="100.5" cy="99.5" r="3.5" fill="#ffffff"/>
<circle cx="148.5" cy="99.5" r="3.5" fill="#ffffff"/>
<path d="M101 132 q27 23 54 0" fill="none" stroke="#0f172a" stroke-width="8" stroke-linecap="round"/>
<circle cx="78" cy="134" r="11" fill="${accent}" opacity="0.5"/>
<circle cx="178" cy="134" r="11" fill="${accent}" opacity="0.5"/>
</svg>`;
  return svgDataUri(svg);
}

const THEME_SPECS = [
  {
    nom: "Blanc (défaut)",
    mode: "light",
    colors: {
      ground: "#ffffff",
      blocks: "#d9d9d9",
      roads: "#b9b9be",
      outline: "#646464",
      green: "#358838",
      primary: "#1e6b37",
    },
  },
  {
    nom: "Océan",
    mode: "light",
    colors: {
      ground: "#ffffff",
      blocks: "#dce7f3",
      roads: "#b6c9dc",
      outline: "#5b7a99",
      green: "#358838",
      primary: "#2563eb",
    },
  },
  {
    nom: "Forêt",
    mode: "light",
    colors: {
      ground: "#f4faf4",
      blocks: "#d7e6d5",
      roads: "#b9ccb7",
      outline: "#5d7a5d",
      green: "#3f9142",
      primary: "#166534",
    },
  },
  {
    nom: "Sépia",
    mode: "light",
    colors: {
      ground: "#fdfaf3",
      blocks: "#e9dfd0",
      roads: "#d3c4ab",
      outline: "#8a7a5f",
      green: "#6b8e23",
      primary: "#b45309",
    },
  },
  {
    nom: "Lavande",
    mode: "light",
    colors: {
      ground: "#faf9ff",
      blocks: "#e5e0f4",
      roads: "#c9c0e2",
      outline: "#7c74a8",
      green: "#4d7c0f",
      primary: "#7c3aed",
    },
  },
  {
    nom: "Darklight",
    mode: "dark",
    colors: {
      ground: "#1f2430",
      blocks: "#2b3242",
      roads: "#3a4356",
      outline: "#5a6478",
      green: "#3f9142",
      primary: "#6ea8fe",
    },
  },
];

const AVATAR_SPECS = [
  { nom: "Momo Classique", colors: { bg: "#e8f5ec", body: "#1e6b37", accent: "#16a34a" } },
  { nom: "Momo Océan", colors: { bg: "#e6f0ff", body: "#2563eb", accent: "#60a5fa" } },
  { nom: "Momo Lavande", colors: { bg: "#f0eaff", body: "#7c3aed", accent: "#a78bfa" } },
  { nom: "Momo Sépia", colors: { bg: "#fbf3e6", body: "#b45309", accent: "#f59e0b" } },
  { nom: "Momo Rose", colors: { bg: "#fee9f1", body: "#db2777", accent: "#fb7185" } },
  { nom: "Momo Menthe", colors: { bg: "#e0f7f4", body: "#0d9488", accent: "#2dd4bf" } },
  { nom: "Momo Ardoise", colors: { bg: "#eef1f5", body: "#334155", accent: "#64748b" } },
  { nom: "Momo Citron", colors: { bg: "#fdfbe3", body: "#ca8a04", accent: "#facc15" } },
  { nom: "Momo Corail", colors: { bg: "#ffece6", body: "#ea580c", accent: "#fb923c" } },
  { nom: "Momo Indigo", colors: { bg: "#e8eaff", body: "#4338ca", accent: "#818cf8" } },
  { nom: "Momo Cerise", colors: { bg: "#ffe5e8", body: "#dc2626", accent: "#f87171" } },
  { nom: "Momo Ciel", colors: { bg: "#e0f2fe", body: "#0284c7", accent: "#38bdf8" } },
  { nom: "Momo Olive", colors: { bg: "#f0f5dc", body: "#65a30d", accent: "#a3e635" } },
  { nom: "Momo Prune", colors: { bg: "#f5e6f0", body: "#9333ea", accent: "#c084fc" } },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI manquant. Ajoutez-le dans backend/.env ou passez-le en variable d'environnement.",
    );
    process.exit(1);
  }

  await mongoose.connect(uri);

  for (const spec of THEME_SPECS) {
    const { colors } = spec;
    await Theme.updateOne(
      { nom: spec.nom },
      {
        $set: {
          nom: spec.nom,
          prix: THEME_PRICE,
          image: themeThumb(colors),
          backgroundColor: colors.ground,
          gridColor: colors.blocks,
          crosshairColor: colors.roads,
          subgridColor: colors.outline,
          greenColor: colors.green,
          primaryColor: colors.primary,
          mode: spec.mode,
          animate: false,
        },
      },
      { upsert: true },
    );
  }

  for (const spec of AVATAR_SPECS) {
    await Avatar.updateOne(
      { nom: spec.nom },
      {
        $set: {
          nom: spec.nom,
          prix: AVATAR_PRICE,
          image: avatarSvg(spec.colors),
        },
      },
      { upsert: true },
    );
  }

  console.log(
    `Boutique initialisée : ${THEME_SPECS.length} thèmes et ${AVATAR_SPECS.length} avatars.`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
