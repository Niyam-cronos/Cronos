import { prisma } from '../lib/prisma';
import { isWithinRadius } from '../lib/geofence';
import { AppError } from '../middleware/error-handler';

export async function validateGeofence(
  companyId: string,
  latitude: number,
  longitude: number
): Promise<{ valid: boolean; locationName?: string; distance?: number }> {
  const locations = await prisma.officeLocation.findMany({
    where: { companyId, isActive: true, latitude: { not: null }, longitude: { not: null } },
  });

  if (locations.length === 0) {
    // No locations configured — allow check-in
    return { valid: true };
  }

  for (const loc of locations) {
    const radius = loc.radius ?? 100;
    if (isWithinRadius(latitude, longitude, loc.latitude!, loc.longitude!, radius)) {
      return { valid: true, locationName: loc.name };
    }
  }

  throw new AppError(403, 'You are outside the allowed office location. Check-in denied.');
}
