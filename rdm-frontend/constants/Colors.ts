/**
 * RDM Moodverse Color Palette
 * Calming blues and refreshing greens for mindful goal achievement
 */

const primaryBlue = '#01377D';      // Deep Navy Blue
const accentBlue = '#009DD1';       // Bright Blue
const lightBlue = '#97E7F5';        // Light Sky Blue
const successGreen = '#7ED348';     // Bright Green
const secondaryGreen = '#26B170';   // Forest Green

export const Colors = {
  light: {
    text: primaryBlue,
    background: '#fff',
    tint: accentBlue,
    icon: primaryBlue,
    tabIconDefault: primaryBlue,
    tabIconSelected: accentBlue,
    primary: primaryBlue,
    accent: accentBlue,
    lightBlue: lightBlue,
    success: successGreen,
    secondary: secondaryGreen,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: lightBlue,
    icon: lightBlue,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: lightBlue,
    primary: accentBlue,
    accent: lightBlue,
    lightBlue: lightBlue,
    success: successGreen,
    secondary: secondaryGreen,
  },
};
