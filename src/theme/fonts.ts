/**
 * Typefaces of the v2 screens (Design.html): Archivo for display, Geist for text, JetBrains Mono
 * for labels and timers. Static weights live in android/app/src/main/assets/fonts (SIL OFL).
 * On Android a custom font is chosen by file name, so never combine these with fontWeight.
 */
export const fonts = {
  display: 'Archivo-Black',        // 900: screen titles, big numbers
  displayBold: 'Archivo-ExtraBold', // 800: card titles, stat values
  body: 'Geist-Regular',
  bodyMedium: 'Geist-Medium',
  bodySemiBold: 'Geist-SemiBold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

/** Letter-spacing in the design is in em; React Native wants points. */
export const em = (value: number, fontSize: number) => value * fontSize;
