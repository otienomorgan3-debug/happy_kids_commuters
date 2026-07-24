import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Minimum dimensions to prevent text/layout from becoming too small
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.15;

const scale = (size) => {
  const scaled = (SCREEN_WIDTH / BASE_WIDTH) * size;
  return Math.max(size * MIN_SCALE, Math.min(size * MAX_SCALE, scaled));
};

const verticalScale = (size) => {
  const scaled = (SCREEN_HEIGHT / BASE_HEIGHT) * size;
  return Math.max(size * MIN_SCALE, Math.min(size * MAX_SCALE, scaled));
};

const moderateScale = (size, factor = 0.5) => {
  const scaled = scale(size);
  return size + (scaled - size) * factor;
};

const fontScale = (size) => {
  const systemFontScale = PixelRatio.getFontScale();
  // Limit font scaling to prevent extreme sizes
  const clampedScale = Math.max(0.8, Math.min(1.3, systemFontScale));
  return size * clampedScale;
};

// Font size scaling - accounts for both screen size and system font scale
const responsiveFontSize = (baseSize) => {
  const scaled = moderateScale(baseSize, 0.5);
  return fontScale(scaled);
};

// Padding/Margin scaling
const spacingScale = (size) => moderateScale(size, 0.6);
const paddingScale = (size) => spacingScale(size);
const marginScale = (size) => spacingScale(size);

// Border radius scaling (lighter scaling to maintain proportion)
const radiusScale = (size) => {
  const scaled = scale(size);
  return scaled * 0.6 + size * 0.4;
};

// Icon size scaling
const iconScale = (size) => moderateScale(size, 0.7);

// Get responsive width percentage with minimum and maximum constraints
const responsiveWidth = (percentage, minWidth, maxWidth) => {
  const calculatedWidth = SCREEN_WIDTH * (percentage / 100);
  const scaledWidth = scale(calculatedWidth);
  
  if (minWidth && maxWidth) {
    return Math.max(scale(minWidth), Math.min(scale(maxWidth), scaledWidth));
  }
  return scaledWidth;
};

// Check if screen is small (for conditional layouts)
const isSmallScreen = () => SCREEN_WIDTH < 350;
const isMediumScreen = () => SCREEN_WIDTH >= 350 && SCREEN_WIDTH < 400;
const isLargeScreen = () => SCREEN_WIDTH >= 400;

// Get dynamic font size based on screen size
const dynamicFontSize = (small, medium, large) => {
  if (isSmallScreen()) return moderateScale(small);
  if (isMediumScreen()) return moderateScale(medium);
  return moderateScale(large);
};

export { 
  scale, 
  verticalScale, 
  moderateScale, 
  fontScale, 
  responsiveFontSize,
  paddingScale,
  marginScale,
  spacingScale,
  radiusScale,
  iconScale,
  responsiveWidth,
  isSmallScreen,
  isMediumScreen,
  isLargeScreen,
  dynamicFontSize,
  SCREEN_WIDTH, 
  SCREEN_HEIGHT 
};
