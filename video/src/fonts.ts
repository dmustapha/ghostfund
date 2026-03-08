import { loadFont as loadGeist } from '@remotion/google-fonts/Geist';
import { loadFont as loadGeistMono } from '@remotion/google-fonts/GeistMono';

const geist = loadGeist();
const geistMono = loadGeistMono();

export const FONT_FAMILY = {
  heading: geist.fontFamily,
  body: geist.fontFamily,
  mono: geistMono.fontFamily,
};
