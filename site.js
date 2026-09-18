// Copyright (c) Meta Platforms, Inc. and affiliates.
"use strict";
const $ = (id) => document.getElementById(id);
const examples = window.UNSTEP_EXAMPLES;
const videos = [$("original-video"), $("unstep-video")];
let model = "sf";
let currentId = examples[0].id;
let filtered = examples;
let playRequest = 0;
let pairWanted = false;
let pairVisible = false;

function pausePair() {
  playRequest += 1;
  pairWanted = false;
  videos.forEach((video) => video.pause());
}

async function playPair() {
  if (!pairVisible || document.hidden) return;
  const request = ++playRequest;
  pairWanted = true;
  videos.forEach((video) => {
    video.muted = true;
  });
  await Promise.allSettled(videos.map((video) => video.play()));
  if (request !== playRequest) return;
  if (!pairVisible || document.hidden) pausePair();
}

function showExample(id) {
  pausePair();
  const example = filtered.find((item) => item.id === id) || filtered[0];
  currentId = example.id;
  $("example").value = example.id;
  $("sample-index").textContent =
    `${String(filtered.indexOf(example) + 1).padStart(2, "0")} / ${String(filtered.length).padStart(2, "0")}`;
  $("sample-prompt").textContent = example.prompt;
  const name = model === "sf" ? "Self Forcing" : "Causal Forcing";
  $("original-label").textContent = name;
  $("unstep-label").textContent = `${name} + UnStep`;
  for (const [index, video] of videos.entries()) {
    const variant = `${model}_${index ? "unstep" : "original"}`;
    video.poster = `media/t2v-${example.id}-${variant}.jpg`;
    video.src = `media/t2v-${example.id}-${variant}.mp4`;
    video.setAttribute(
      "aria-label",
      `${index ? name + " + UnStep" : name}: ${example.prompt}`,
    );
    video.closest("figure").querySelector(".media-error").hidden = true;
    video.load();
  }
  playPair();
  $("previous").disabled = filtered.length < 2;
  $("next").disabled = filtered.length < 2;
}

function populateExamples() {
  filtered = examples.filter(
    (item) =>
      $("category").value === "all" || item.category === $("category").value,
  );
  $("example").replaceChildren(
    ...filtered.map((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.title;
      return option;
    }),
  );
  showExample(currentId);
}

$("category").addEventListener("change", populateExamples);
$("example").addEventListener("change", (event) =>
  showExample(event.target.value),
);
for (const button of document.querySelectorAll("[data-model]")) {
  button.addEventListener("click", () => {
    model = button.dataset.model;
    for (const other of document.querySelectorAll("[data-model]"))
      other.setAttribute("aria-pressed", String(other === button));
    showExample(currentId);
  });
}
for (const [id, direction] of [
  ["previous", -1],
  ["next", 1],
]) {
  $(id).addEventListener("click", () => {
    const index = filtered.findIndex((item) => item.id === currentId);
    showExample(
      filtered[(index + direction + filtered.length) % filtered.length].id,
    );
  });
}
videos.forEach((video) => {
  video.addEventListener("play", () => {
    if (!pairVisible || document.hidden) video.pause();
  });
  video.addEventListener("canplay", () => {
    if (video.paused) playPair();
  });
  video.addEventListener("error", () => {
    const error = video.closest("figure").querySelector(".media-error");
    error.hidden = false;
    error.querySelector("a").href = video.getAttribute("src");
    pairWanted = false;
    video.pause();
  });
});
// Correct loading/loop drift only during paired playback; native controls remain usable.
videos[0].addEventListener("timeupdate", () => {
  if (
    pairWanted &&
    videos.every((video) => !video.paused && video.readyState >= 3) &&
    Math.abs(videos[0].currentTime - videos[1].currentTime) > 0.25
  ) {
    videos[1].currentTime = videos[0].currentTime;
  }
});

const hero = $("hero-video");
const heroExamples = window.UNSTEP_HERO_EXAMPLES;
let heroIndex = 0;
let heroVisible = true;
const heroModels = {
  wan14b: "Wan2.1-T2V-14B",
};
function showHero(index) {
  heroIndex = (index + heroExamples.length) % heroExamples.length;
  const example = heroExamples[heroIndex];
  const src = `media/${example.id}.mp4`;
  hero.poster = `media/${example.id}.jpg`;
  hero.style.setProperty(
    "--hero-mobile-position",
    example.mobilePosition || "60% center",
  );
  const modelName = heroModels[example.variant];
  hero.setAttribute("aria-label", `${modelName}: ${example.prompt}`);
  if (hero.getAttribute("src") !== src) {
    hero.src = src;
    hero.load();
  }
  playHero();
}
async function playHero() {
  if (document.hidden || !heroVisible) return;
  hero.muted = true;
  try {
    await hero.play();
  } catch {
    /* Retry on readiness, visibility, or the next user interaction. */
  }
}
// Without JavaScript the first clip loops; with it, the complete playlist loops.
hero.loop = false;
hero.addEventListener("ended", () => showHero(heroIndex + 1));
hero.addEventListener("canplay", playHero);
new IntersectionObserver(
  (entries) => {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible) playHero();
  },
  { threshold: 0.05 },
).observe(hero);
new IntersectionObserver(
  (entries) => {
    pairVisible = entries[0].isIntersecting;
    if (pairVisible) playPair();
    else pausePair();
  },
  { threshold: 0.05 },
).observe(document.querySelector(".comparison"));

const i2vVideos = [$("i2v-original-video"), $("i2v-unstep-video")];
let i2vVisible = false;
function pauseI2V() {
  i2vVideos.forEach((video) => video.pause());
}
async function playI2V() {
  if (!i2vVisible || document.hidden) return;
  await Promise.allSettled(
    i2vVideos.map((video) => {
      video.muted = true;
      return video.play();
    }),
  );
  if (!i2vVisible || document.hidden) pauseI2V();
}
function showI2V() {
  pauseI2V();
  const example = window.UNSTEP_I2V_EXAMPLES.find(
    (item) => item.id === $("i2v-example").value,
  );
  $("i2v-prompt").textContent = example.prompt;
  $("i2v-reference").src = `media/i2v-${example.id}-reference.jpg`;
  $("i2v-reference").alt = `Reference image: ${example.prompt}`;
  for (const [index, video] of i2vVideos.entries()) {
    const variant = index ? "sf_unstep" : "sf_original";
    video.poster = `media/i2v-${example.id}-${variant}.jpg`;
    video.src = `media/i2v-${example.id}-${variant}.mp4`;
    video.setAttribute(
      "aria-label",
      `${index ? "Self Forcing + UnStep" : "Self Forcing"}: ${example.prompt}`,
    );
    video.closest("figure").querySelector(".media-error").hidden = true;
    video.load();
  }
  playI2V();
}
$("i2v-example").addEventListener("change", showI2V);
i2vVideos.forEach((video) => {
  video.addEventListener("play", () => {
    if (!i2vVisible || document.hidden) video.pause();
  });
  video.addEventListener("canplay", () => {
    if (video.paused) playI2V();
  });
  video.addEventListener("error", () => {
    const error = video.closest("figure").querySelector(".media-error");
    error.hidden = false;
    error.querySelector("a").href = video.getAttribute("src");
    video.pause();
  });
});
i2vVideos[0].addEventListener("timeupdate", () => {
  if (
    i2vVideos.every((video) => !video.paused && video.readyState >= 3) &&
    Math.abs(i2vVideos[0].currentTime - i2vVideos[1].currentTime) > 0.25
  ) {
    i2vVideos[1].currentTime = i2vVideos[0].currentTime;
  }
});
new IntersectionObserver(
  (entries) => {
    i2vVisible = entries[0].isIntersecting;
    if (i2vVisible) playI2V();
    else pauseI2V();
  },
  { threshold: 0.05 },
).observe(document.querySelector(".i2v-grid"));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pausePair();
    pauseI2V();
  } else resumeVideos();
});
function resumeVideos() {
  if (hero.paused || hero.ended) playHero();
  if (videos.some((video) => video.paused)) playPair();
  if (i2vVideos.some((video) => video.paused)) playI2V();
}
window.addEventListener("pageshow", resumeVideos);
window.addEventListener("focus", resumeVideos);
function retryFromInteraction(event) {
  // Let native video controls handle their own play/pause gesture.
  if (event.target instanceof Element && event.target.closest("video")) return;
  resumeVideos();
}
document.addEventListener("pointerdown", retryFromInteraction, {
  passive: true,
});
document.addEventListener("keydown", retryFromInteraction);
showHero(0);
populateExamples();
showI2V();
