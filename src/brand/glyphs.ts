/**
 * Letter outlines for the fasla wordmark: Bricolage Grotesque, weight 800, optical size 96 (the
 * cut used for the 1a app icon), extracted with fontTools. Font units, baseline at y = 0, y grows
 * downward (SVG). Drawing outlines keeps the logo identical on every phone with no font loading.
 * Bricolage Grotesque: SIL Open Font License (android/app/src/main/assets/fonts/OFL-*.txt).
 * Regenerate rather than hand-edit.
 */
export const UNITS_PER_EM = 1000;
/** Highest point of these glyphs above the baseline (f, l), in font units. */
export const GLYPH_TOP = 714;
/** Lowest overshoot below the baseline (round letters), in font units. */
export const GLYPH_BOTTOM = 14;

export interface Glyph { d: string; advance: number; xMin: number; xMax: number; yMax: number; yMin: number }

export const GLYPHS: Record<'f' | 'a' | 's' | 'l' | '.', Glyph> = {
  "f": { advance: 376, xMin: 11, xMax: 364, yMax: 714, yMin: 0, d: "M84 0V-323H11V-439L172 -428V-436Q111 -443 80 -465Q49 -487 38.5 -515Q28 -543 28 -566Q28 -611 52.5 -644.5Q77 -678 120.5 -696Q164 -714 219 -714Q264 -714 299.5 -702Q335 -690 364 -667L351 -519Q324 -538 299 -547.5Q274 -557 248 -557Q218 -557 198.5 -544Q179 -531 179 -503Q179 -488 187 -475Q195 -462 212.5 -454.5Q230 -447 260 -447H360V-323H244V0Z" },
  "a": { advance: 543, xMin: 17, xMax: 513, yMax: 542, yMin: -14, d: "M175 14Q135 14 99 0Q63 -14 40 -45.5Q17 -77 17 -130Q17 -179 36 -209.5Q55 -240 87 -258.5Q119 -277 157 -286.5Q195 -296 232 -303Q284 -313 310 -319Q336 -325 345.5 -333Q355 -341 355 -355Q355 -384 333.5 -399Q312 -414 277 -414Q255 -414 233 -406Q211 -398 197 -377.5Q183 -357 184 -319L40 -329Q38 -392 59 -433.5Q80 -475 116.5 -498.5Q153 -522 196.5 -532Q240 -542 283 -542Q362 -542 413 -512.5Q464 -483 488.5 -427.5Q513 -372 513 -293V-199Q513 -166 513 -132.5Q513 -99 513 -66Q513 -33 513 0H373Q373 -36 373 -73Q373 -110 373 -151H367Q363 -106 337.5 -68.5Q312 -31 270.5 -8.5Q229 14 175 14ZM242 -104Q259 -104 278.5 -110.5Q298 -117 315.5 -132Q333 -147 344 -173.5Q355 -200 355 -239V-263L382 -266Q374 -253 355.5 -245Q337 -237 314 -232.5Q291 -228 267.5 -223.5Q244 -219 224 -211.5Q204 -204 191.5 -191.5Q179 -179 179 -157Q179 -131 197.5 -117.5Q216 -104 242 -104Z" },
  "s": { advance: 517, xMin: 24, xMax: 501, yMax: 542, yMin: -14, d: "M267 14Q214 14 168.5 3.5Q123 -7 89.5 -30Q56 -53 38.5 -91.5Q21 -130 24 -185L165 -197Q167 -164 180 -142.5Q193 -121 216 -111Q239 -101 272 -101Q303 -101 325.5 -111.5Q348 -122 348 -147Q348 -160 340 -168.5Q332 -177 310.5 -184.5Q289 -192 248 -202Q197 -215 156 -228Q115 -241 86 -259Q57 -277 42 -303.5Q27 -330 27 -369Q27 -424 56.5 -462.5Q86 -501 138 -521.5Q190 -542 258 -542Q319 -542 372 -523Q425 -504 455.5 -461Q486 -418 478 -347L340 -334Q343 -363 332 -383.5Q321 -404 300 -414.5Q279 -425 249 -425Q215 -425 196.5 -412.5Q178 -400 178 -381Q178 -366 189.5 -355.5Q201 -345 225.5 -337.5Q250 -330 289 -321Q323 -314 360 -303Q397 -292 429 -273.5Q461 -255 481 -225Q501 -195 501 -149Q501 -100 474 -63Q447 -26 395 -6Q343 14 267 14Z" },
  "l": { advance: 234, xMin: 36, xMax: 198, yMax: 700, yMin: 0, d: "M36 0V-700H198V0Z" },
  ".": { advance: 246, xMin: 20, xMax: 226, yMax: 168, yMin: -13, d: "M122 13Q71 13 45.5 -9Q20 -31 20 -77Q20 -124 45.5 -146Q71 -168 122 -168Q174 -168 200 -146Q226 -124 226 -77Q226 13 122 13Z" },
};
