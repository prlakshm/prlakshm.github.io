import { existsSync, readFileSync } from "node:fs";

const deckPath = "public/branding/deck.html";
const indexPath = "public/branding/index.html";

if (!existsSync(deckPath)) {
  throw new Error(`${deckPath} is missing`);
}

if (!existsSync(indexPath)) {
  throw new Error(`${indexPath} is missing`);
}

const deck = readFileSync(deckPath, "utf8");
const index = readFileSync(indexPath, "utf8");
const slideCount = (deck.match(/<section\s+class="[^"]*\bslide\b/g) ?? []).length;
const soundGlyphCount = (deck.match(/data-sound-glyph=/g) ?? []).length;

if (slideCount !== 18) {
  throw new Error(`expected 18 slides, found ${slideCount}`);
}

if (soundGlyphCount !== 5) {
  throw new Error(`expected 5 independent SOUND glyphs, found ${soundGlyphCount}`);
}

for (const asset of [
  "./assets/figma-sound-megaphone-final.png",
  "./assets/figma-sound-megaphone-mobile-final.png",
  "./assets/figma-sound-piano-final.png",
  "./assets/figma-sound-piano-mobile-final.png",
]) {
  if (!deck.includes(asset)) {
    throw new Error(`deck does not reference ${asset}`);
  }
  if (!existsSync(`public/branding/${asset.slice(2)}`)) {
    throw new Error(`public/branding/${asset.slice(2)} is missing`);
  }
}

if (deck.includes("./assets/figma-sound-title.png")) {
  throw new Error("the Figma title must be text-only and cannot use the former title photograph");
}

const campaignArtCount = (deck.match(/class="[^"]*\bsound-art\b/g) ?? []).length;
if (campaignArtCount !== 2) {
  throw new Error(`expected exactly 2 Figma campaign-art slides, found ${campaignArtCount}`);
}

if (!deck.includes("--sound-ground: #052427")) {
  throw new Error("Figma chapter does not use the approved #052427 background");
}

for (const statement of [
  "Figma Sound makes sound a design system material.",
  "A component can have visual states and motion behavior. Now, it can have sonic behavior.",
  "What will your interface sound like?",
]) {
  if (!deck.includes(statement)) {
    throw new Error(`deck is missing approved statement: ${statement}`);
  }
}

if (deck.includes("Figma Sound makes sound a design system material. A component can have visual states and motion behavior. Now, it can have sonic behavior.")) {
  throw new Error("deck retains the rejected combined thesis");
}

const penultimate = deck.match(/<section[^>]*data-slide="17"[\s\S]*?<\/section>/)?.[0] ?? "";
if (!penultimate.includes("What will your interface sound like?")) {
  throw new Error("slide 17 must be the approved penultimate question");
}

if (deck.includes("Design what an interface sounds like.")) {
  throw new Error("deck retains the replaced closing proposition");
}

const closing = deck.match(/<section[^>]*data-slide="18"[\s\S]*?<\/section>/)?.[0] ?? "";
if (!closing.includes("./assets/figma-sound-piano-final.png") || !closing.includes("./assets/figma-sound-piano-mobile-final.png")) {
  throw new Error("slide 18 must be the piano closing image");
}

for (const marker of [
  'id="soundToggle"',
  'class="title-lockup"',
  'id="titleAudio"',
  "unlockTitleAudio",
  "playAudioCue",
]) {
  if (!deck.includes(marker)) {
    throw new Error(`title motion or sound implementation is missing ${marker}`);
  }
}

const hasLegacyTitleScore = ["playKeyboardClick", "playMouseClick", "playDragCue"].every((marker) => deck.includes(marker));
const hasParticleTitleScore = ["id=\"titleParticles\"", "createParticleTitle", "playMeteorCue", "playLandCue"].every((marker) => deck.includes(marker));
if (!hasLegacyTitleScore && !hasParticleTitleScore) {
  throw new Error("deck is missing a complete title sound implementation");
}


for (const asset of [
  "./assets/audio/interface-key.wav",
  "./assets/audio/interface-click.wav",
  "./assets/audio/interface-drag.wav",
  "./assets/audio/interface-drop.wav",
  "./assets/audio/portfolio-select.wav",
  "./assets/audio/portfolio-resolve.wav",
]) {
  if (!deck.includes(asset)) {
    throw new Error(`deck does not preload ${asset}`);
  }
  if (!existsSync(`public/branding/${asset.slice(2)}`)) {
    throw new Error(`public/branding/${asset.slice(2)} is missing`);
  }
}

const titleSlide = deck.match(/<section[^>]*data-slide="10"[\s\S]*?<\/section>/)?.[0] ?? "";
if (/data-slide-audio/.test(titleSlide)) {
  throw new Error("hero title must not receive a new slide-entry audio cue");
}

const megaphoneSlide = deck.match(/<section[^>]*data-slide="11"[\s\S]*?<\/section>/)?.[0] ?? "";
if (!megaphoneSlide.includes("./assets/figma-sound-megaphone-final.png") || !megaphoneSlide.includes("./assets/figma-sound-megaphone-mobile-final.png")) {
  throw new Error("slide 11 must be the megaphone campaign image directly after the title");
}

for (const slideNumber of ["11", "12", "13", "14", "15", "16", "17"]) {
  const slide = deck.match(new RegExp(`<section[^>]*data-slide="${slideNumber}"[\\s\\S]*?<\\/section>`))?.[0] ?? "";
  if (!/data-slide-audio="select"/.test(slide)) {
    throw new Error(`slide ${slideNumber} must use the shared interface transition cue`);
  }
}

const pianoSlide = deck.match(/<section[^>]*data-slide="18"[\s\S]*?<\/section>/)?.[0] ?? "";
if (!/data-slide-audio="resolve"/.test(pianoSlide)) {
  throw new Error("slide 18 must retain the final piano-key cue");
}

if (deck.includes('aria-label="Reusable sound tokens"')) {
  throw new Error("the removed reusable-tokens copy slide remains in the deck");
}

if (deck.includes("figma-sound-listening.png") || existsSync("public/branding/assets/figma-sound-listening.png")) {
  throw new Error("the removed listening image remains in the Figma Sound deck");
}

for (const removedTransitionCue of ["portfolio-arrive.wav", "portfolio-sweep.wav"]) {
  if (deck.includes(removedTransitionCue)) {
    throw new Error(`deck still preloads the removed ${removedTransitionCue} transition cue`);
  }
}

if (!deck.includes("playCampaignSlideCue")) {
  throw new Error("deck is missing the non-hero Figma Sound cue controller");
}

if (!/const primeAudio[\s\S]*?opened && currentIndex\(\) !== 9\)\s*\{?\s*playCampaignSlideCue\(currentIndex\(\), \{ force: true \}\)/.test(deck)) {
  throw new Error("the title exit must play the selected second-slide cue after audio unlocks");
}

if (!/if \(!soundEnabled \|\| !audioUnlocked\) return;\s*const cue = slide\.dataset\.slideAudio;\s*lastCampaignCueIndex = index;/.test(deck)) {
  throw new Error("campaign slides must not be marked as cued before their audio can play");
}

if (/title-drag-drop|translate3d\(\.35em/.test(deck)) {
  throw new Error("SOUND still translates during its entrance instead of animating in place");
}

if (/playTitleSequence[\s\S]*?scheduleTitleCue\(playDropCue/.test(deck)) {
  throw new Error("title still schedules the rejected bounce/drop sound");
}

if (existsSync("public/branding/assets/figma-sound-title.png")) {
  throw new Error("unused title photograph remains in branding assets");
}

for (const cursorAsset of [
  "../cursor/wordmark.html",
  "../cursor/orbit.html",
  "../cursor/assets/brand/slide-02-office-final-v2.png",
]) {
  if (!deck.includes(cursorAsset)) {
    throw new Error(`deck does not use portable Cursor path ${cursorAsset}`);
  }
}

if (/\b(?:src|href)="\/(?:branding|cursor)\//.test(deck)) {
  throw new Error("deck contains server-root asset paths that break when opened directly");
}

if (!deck.includes('../fonts/general-sans/GeneralSans-Variable.woff2')) {
  throw new Error('deck does not load the approved General Sans body font');
}

if (!/\.sound-slide\s*\{[^}]*font-family:\s*"General Sans"/s.test(deck)) {
  throw new Error('Figma campaign slides do not use General Sans for body copy');
}

if (!/\.sound-copy\s*\{[^}]*font-weight:\s*400/s.test(deck)) {
  throw new Error('Figma campaign statements do not use General Sans Regular');
}

if (!/\.sound-copy\s*\{[^}]*font-size:\s*clamp\(24px,\s*2\.6vw,\s*42px\)/s.test(deck)) {
  throw new Error('Figma campaign statements do not match the Cursor body scale');
}

if (/\.sound-copy\.(?:long|closing)\s*\{[^}]*font-size:/s.test(deck)) {
  throw new Error('A Figma statement variant overrides the shared Cursor body scale');
}

if (!/\.sound-copy\s*\{[^}]*max-width:\s*32em[^}]*width:\s*min\(86vw,\s*32em\)/s.test(deck)) {
  throw new Error('Figma campaign statements do not match the Cursor text measure');
}

if (!/\.sound-copy\s*\{[^}]*padding:\s*0/s.test(deck)) {
  throw new Error('Figma campaign statements retain padding that narrows the text measure');
}

if (!/\.sound-copy\s*\{[^}]*letter-spacing:\s*-0\.025em[^}]*line-height:\s*1\.12/s.test(deck)) {
  throw new Error('Figma campaign statements do not use the approved Figma Sans-inspired rhythm');
}

if (!index.includes("./deck.html")) {
  throw new Error("branding index does not point to ./deck.html");
}

console.log(`PASS: ${slideCount} slides, ${soundGlyphCount} SOUND glyphs, assets present`);
