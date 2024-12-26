import { createCanvas } from 'canvas';
import { Buffer } from 'buffer';

const captchaStore: Map<string, string> = new Map();

/**
 * Generate a random CAPTCHA text
 * @returns string
 */
const generateCaptchaText = (): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const captchaLength = 6;
  let captchaText = '';

  for (let i = 0; i < captchaLength; i++) {
    captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return captchaText;
};

/**
 * Create a CAPTCHA image
 * @returns {id: string, image: Buffer}
 */
export const generateCaptchaImage = (): { id: string; image: Buffer } => {
  const captchaText = generateCaptchaText();
  const id = Math.random().toString(36).substr(2, 9); // Unique ID for CAPTCHA

  // Store the CAPTCHA text with the ID
  captchaStore.set(id, captchaText);

  // Create an image canvas
  const width = 200;
  const height = 70;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(0, 0, width, height);

  // Add random lines for noise
  ctx.strokeStyle = '#ccc';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  // Draw CAPTCHA text
  ctx.font = '30px Arial';
  ctx.fillStyle = '#333';
  ctx.textBaseline = 'middle';
  const textX = 20;
  const textY = height / 2;

  for (let i = 0; i < captchaText.length; i++) {
    ctx.fillText(
      captchaText[i],
      textX + i * 30,
      textY + (Math.random() * 10 - 5)
    );
  }

  // Add noise dots
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.random()})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
  }

  // Return the image as a Buffer
  return { id, image: canvas.toBuffer() };
};

/**
 * Verify CAPTCHA input
 * @param id - CAPTCHA ID
 * @param userInput - User input
 * @returns boolean
 */
export const verifyCaptcha = (id: string, userInput: string): boolean => {
  const expectedText = captchaStore.get(id);

  if (!expectedText) {
    return false; // Invalid or expired CAPTCHA
  }

  const isValid = expectedText.toLowerCase() === userInput.toLowerCase();

  // Remove CAPTCHA after validation to prevent reuse
  captchaStore.delete(id);

  return isValid;
};
