import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

export const hashPassword = (raw: string) => bcrypt.hash(raw, BCRYPT_ROUNDS);

export const verifyPassword = (raw: string, hash: string) => bcrypt.compare(raw, hash);
