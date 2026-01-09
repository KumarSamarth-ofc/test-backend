// Regex patterns for detecting sensitive information
const PATTERNS = {
  PHONE: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
  HANDLE: /@[\w.-]+/g,
  WHATSAPP: /wa\.me\/\d+/gi,
  TELEGRAM: /t\.me\/[\w.-]+/gi,
  INSTAGRAM: /instagram\.com\/[\w.-]+/gi,
  FACEBOOK: /facebook\.com\/[\w.-]+/gi,
  TWITTER: /(twitter\.com|x\.com)\/[\w.-]+/gi,
};

const MASK_STRING = "********";
const MAX_MESSAGE_LENGTH = 10000;

// Masks sensitive information in a message (phone, email, social handles, etc.)
const maskContent = (message, options = {}) => {
  const { logMasking = true } = options;

  if (typeof message !== "string") {
    console.warn("maskContent: Expected string, got", typeof message);
    return message;
  }

  if (!message || message.trim().length === 0) {
    return message;
  }

  // Truncate message if it exceeds max length
  if (message.length > MAX_MESSAGE_LENGTH) {
    console.warn(
      `maskContent: Message exceeds max length (${MAX_MESSAGE_LENGTH})`
    );
    message = message.substring(0, MAX_MESSAGE_LENGTH);
  }

  let cleanMessage = message;
  let maskedCount = 0;
  const maskedItems = [];

  // Mask social media links and handles
  cleanMessage = cleanMessage.replace(PATTERNS.WHATSAPP, (match) => {
    maskedItems.push({ type: "whatsapp", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  cleanMessage = cleanMessage.replace(PATTERNS.TELEGRAM, (match) => {
    maskedItems.push({ type: "telegram", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  cleanMessage = cleanMessage.replace(PATTERNS.INSTAGRAM, (match) => {
    maskedItems.push({ type: "instagram", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  cleanMessage = cleanMessage.replace(PATTERNS.FACEBOOK, (match) => {
    maskedItems.push({ type: "facebook", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  cleanMessage = cleanMessage.replace(PATTERNS.TWITTER, (match) => {
    maskedItems.push({ type: "twitter", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  // Mask email addresses
  cleanMessage = cleanMessage.replace(PATTERNS.EMAIL, (match) => {
    maskedItems.push({ type: "email", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  // Mask phone numbers
  cleanMessage = cleanMessage.replace(PATTERNS.PHONE, (match) => {
    maskedItems.push({ type: "phone", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  // Mask social handles
  cleanMessage = cleanMessage.replace(PATTERNS.HANDLE, (match) => {
    maskedItems.push({ type: "handle", value: match });
    maskedCount++;
    return MASK_STRING;
  });

  if (logMasking && maskedCount > 0) {
    console.log(`[ContentSafety] Masked ${maskedCount} items:`, maskedItems);
  }

  return cleanMessage;
};

// Checks if a message contains sensitive information
const containsSensitiveInfo = (message) => {
  if (typeof message !== "string" || !message) {
    return false;
  }

  return Object.values(PATTERNS).some((pattern) => {
    const regex = new RegExp(pattern.source, pattern.flags);
    return regex.test(message);
  });
};

// Gets count of each type of sensitive information in a message
const getSensitiveInfoCount = (message) => {
  if (typeof message !== "string" || !message) {
    return {};
  }

  const counts = {
    phone: 0,
    email: 0,
    handle: 0,
    whatsapp: 0,
    telegram: 0,
    instagram: 0,
    facebook: 0,
    twitter: 0,
  };

  // Count matches for each pattern
  const phoneMatches = message.match(PATTERNS.PHONE);
  if (phoneMatches) counts.phone = phoneMatches.length;

  const emailMatches = message.match(PATTERNS.EMAIL);
  if (emailMatches) counts.email = emailMatches.length;

  const handleMatches = message.match(PATTERNS.HANDLE);
  if (handleMatches) counts.handle = handleMatches.length;

  const whatsappMatches = message.match(PATTERNS.WHATSAPP);
  if (whatsappMatches) counts.whatsapp = whatsappMatches.length;

  const telegramMatches = message.match(PATTERNS.TELEGRAM);
  if (telegramMatches) counts.telegram = telegramMatches.length;

  const instagramMatches = message.match(PATTERNS.INSTAGRAM);
  if (instagramMatches) counts.instagram = instagramMatches.length;

  const facebookMatches = message.match(PATTERNS.FACEBOOK);
  if (facebookMatches) counts.facebook = facebookMatches.length;

  const twitterMatches = message.match(PATTERNS.TWITTER);
  if (twitterMatches) counts.twitter = twitterMatches.length;

  return counts;
};

module.exports = {
  maskContent,
  containsSensitiveInfo,
  getSensitiveInfoCount,
  PATTERNS,
  MASK_STRING,
  MAX_MESSAGE_LENGTH,
};
