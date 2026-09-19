import { prisma } from "./prisma";

const SETTINGS_ID = "singleton";

export type SiteSettings = {
  depositPercent: number;
  freeCancellationDays: number;
  cancellationFeePercent: number;
};

const DEFAULT_SETTINGS: SiteSettings = {
  depositPercent: 100,
  freeCancellationDays: 3,
  cancellationFeePercent: 25,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { id: SETTINGS_ID } });
    if (!setting) return DEFAULT_SETTINGS;
    return {
      depositPercent: setting.depositPercent,
      freeCancellationDays: setting.freeCancellationDays,
      cancellationFeePercent: setting.cancellationFeePercent,
    };
  } catch (error) {
    console.warn("Could not load site settings, using defaults", error);
    return DEFAULT_SETTINGS;
  }
}

export async function getDepositPercent(): Promise<number> {
  const settings = await getSiteSettings();
  return settings.depositPercent;
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

export async function getCancellationPolicy() {
  const settings = await getSiteSettings();
  return {
    freeCancellationDays: settings.freeCancellationDays,
    cancellationFeePercent: settings.cancellationFeePercent,
  };
}

export async function setCancellationPolicy(input: {
  freeCancellationDays: number;
  cancellationFeePercent: number;
}) {
  const freeCancellationDays = Math.min(30, Math.max(0, Math.round(input.freeCancellationDays)));
  const cancellationFeePercent = Math.min(100, Math.max(0, Math.round(input.cancellationFeePercent)));
  const setting = await prisma.siteSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { freeCancellationDays, cancellationFeePercent },
    create: { id: SETTINGS_ID, freeCancellationDays, cancellationFeePercent },
  });
  return {
    freeCancellationDays: setting.freeCancellationDays,
    cancellationFeePercent: setting.cancellationFeePercent,
  };
}
