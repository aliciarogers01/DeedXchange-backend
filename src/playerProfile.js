const INSTALLATION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{2,23}$/;
const STATE_PATTERN = /^[A-Z]{2}$/;
const ZIP_PATTERN = /^\d{5}$/;

function cleanSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeProfile(input) {
  return {
    username: cleanSpaces(input.username),
    city: cleanSpaces(input.city),
    state: cleanSpaces(input.state).toUpperCase(),
    zip: cleanSpaces(input.zip),
  };
}

function validateInstallationId(installationId) {
  if (!INSTALLATION_ID_PATTERN.test(installationId)) {
    return "A valid installation ID is required.";
  }
  return null;
}

function validateProfile(profile) {
  if (!USERNAME_PATTERN.test(profile.username)) {
    return "Username must be 3–24 characters and may use letters, numbers, spaces, dots, underscores, and hyphens.";
  }
  if (profile.city.length < 2 || profile.city.length > 80) {
    return "City must be 2–80 characters.";
  }
  if (!STATE_PATTERN.test(profile.state)) {
    return "State must be a two-letter abbreviation.";
  }
  if (!ZIP_PATTERN.test(profile.zip)) {
    return "ZIP code must contain exactly five digits.";
  }
  return null;
}

function formatUserId(playerNumber) {
  if (!Number.isSafeInteger(playerNumber) || playerNumber < 1 || playerNumber > 999999999) {
    throw new RangeError("Player number must be from 1 through 999999999.");
  }
  const digits = String(playerNumber).padStart(9, "0");
  return `DX-${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function validateProfilePhoto(photoBase64, photoMimeType) {
  const mimeType = String(photoMimeType || "").toLowerCase();
  if (!photoBase64 || !["image/jpeg", "image/png"].includes(mimeType)) {
    return { error: "A JPEG or PNG player picture is required." };
  }

  const data = Buffer.from(String(photoBase64), "base64");
  if (data.length < 32 || data.length > 1024 * 1024) {
    return { error: "The player picture must be no larger than 1 MB." };
  }

  const isJpeg = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const isPng =
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;
  if ((mimeType === "image/jpeg" && !isJpeg) || (mimeType === "image/png" && !isPng)) {
    return { error: "The player picture format is invalid." };
  }

  return { data, mimeType };
}

module.exports = {
  formatUserId,
  normalizeProfile,
  validateInstallationId,
  validateProfile,
  validateProfilePhoto,
};
