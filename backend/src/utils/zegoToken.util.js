import crypto from "crypto";

const MAX_ZEGO_TOKEN_TTL_SECONDS = 24 * 24 * 60 * 60;

const randomNonce = () => crypto.randomInt(0, 2147483647);

const normalizeSecretKey = (serverSecret) => {
  const utf8Buffer = Buffer.from(serverSecret, "utf8");

  if ([16, 24, 32].includes(utf8Buffer.length)) {
    return utf8Buffer;
  }

  if (/^[A-Za-z][0-9a-fA-F]{32}$/.test(serverSecret)) {
    return Buffer.from(serverSecret.slice(1), "utf8");
  }

  return null;
};

export const generateZegoToken = ({
  userId,
  roomId,
  role,
  effectiveTimeInSeconds = 7200,
}) => {
  const appId = Number(process.env.ZEGO_APP_ID);
  const serverSecret = process.env.ZEGO_SERVER_SECRET;

  if (!appId || !serverSecret) {
    throw new Error("ZEGO_APP_ID_AND_SERVER_SECRET_REQUIRED");
  }

  const secretKey = normalizeSecretKey(serverSecret);

  if (!secretKey) {
    throw new Error("INVALID_ZEGO_SERVER_SECRET");
  }

  if (effectiveTimeInSeconds > MAX_ZEGO_TOKEN_TTL_SECONDS) {
    throw new Error("TOKEN_TTL_TOO_LONG");
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expireTime = currentTime + effectiveTimeInSeconds;
  const iv = crypto.randomBytes(16);

  const body = {
    app_id: appId,
    user_id: String(userId),
    nonce: randomNonce(),
    ctime: currentTime,
    expire: expireTime,
    payload: JSON.stringify({
      room_id: roomId,
      role,
    }),
  };

  const cipher = crypto.createCipheriv(
    `aes-${secretKey.length * 8}-cbc`,
    secretKey,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(body), "utf8"),
    cipher.final(),
  ]);

  const tokenBuffer = Buffer.alloc(8 + 2 + iv.length + 2 + encrypted.length);
  tokenBuffer.writeUInt32BE(0, 0);
  tokenBuffer.writeUInt32BE(expireTime, 4);
  tokenBuffer.writeUInt16BE(iv.length, 8);
  iv.copy(tokenBuffer, 10);
  tokenBuffer.writeUInt16BE(encrypted.length, 10 + iv.length);
  encrypted.copy(tokenBuffer, 12 + iv.length);

  return `04${tokenBuffer.toString("base64")}`;
};
