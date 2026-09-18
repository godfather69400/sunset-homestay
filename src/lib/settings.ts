import { prisma } from "./prisma";

const SETTINGS_ID = "singleton";

export async function getDepositPercent(): Promise<number> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID } });
    return setting?.depositPercent ?? 100;
  } catch (error) {
    console.warn("Could not load site settings, defaulting to 100% advance", error);
    return 100;
  }
}

export async function setDepositPercent(percent: number): Promise<number> {
  const clamped = Math.min(100, Math.max(1, Math.round(percent)));
  const setting = await prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { depositPercent: clamped },
    create: { id: SETTINGS_ID, depositPercent: clamped },
  });
  return setting.depositPercent;
}
