import { requireUser } from "@/lib/auth-helpers";
import { handleRouteError, ok } from "@/lib/api";
import { assertRateLimit, clientKey } from "@/lib/services/rate-limit.service";
import {
  getOwnerProperty,
  notifyFavoritePriceChange,
  softDeleteProperty,
  updateProperty,
} from "@/lib/services/property.service";
import { propertyUpdateSchema } from "@/lib/validation/property";
import { uuidSchema } from "@/lib/validation/common";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/properties/[id] — the owner's editable copy of one listing. */
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok(await getOwnerProperty(user, uuidSchema.parse(id)));
  } catch (error) {
    return handleRouteError(error, "GET /api/properties/[id]");
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const propertyId = uuidSchema.parse(id);
    assertRateLimit(`${clientKey(request, user.id)}:property-update`, { max: 30, windowSeconds: 600 });

    const before = await getOwnerProperty(user, propertyId);
    const input = propertyUpdateSchema.parse(await request.json());
    const property = await updateProperty(user, propertyId, input);

    // Students who saved this listing are told when the rent drops.
    if (input.rentAmount !== undefined && input.rentAmount < before.rentAmount) {
      await notifyFavoritePriceChange(propertyId, input.rentAmount);
    }

    return ok(property);
  } catch (error) {
    return handleRouteError(error, "PATCH /api/properties/[id]");
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    assertRateLimit(`${clientKey(request, user.id)}:property-delete`, { max: 10, windowSeconds: 600 });
    await softDeleteProperty(user, uuidSchema.parse(id));
    return ok({ deleted: true });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/properties/[id]");
  }
}
