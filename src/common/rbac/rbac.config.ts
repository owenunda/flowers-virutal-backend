import { Permission } from './permission.enum';
import { Role } from './role.enum';

export const rolePermissions: Record<Role, Permission[]> = {
  [Role.CLIENTE]: [
    Permission.PRODUCT_READ,
    Permission.ORDER_CREATE,
    Permission.ORDER_SUBMIT,
    Permission.ORDER_DELETE,
  ],
  [Role.EMPLEADO]: [
    Permission.USER_CREATE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_MANAGE,
    Permission.PRICING_MANAGE,
    Permission.ORDER_CREATE,
    Permission.ORDER_SUBMIT,
    Permission.ORDER_DELETE,
    Permission.ORDER_REVIEW,
    Permission.ORDER_APPROVE,
    Permission.ORDER_DECLINE,
    Permission.ORDER_COMPLETE,
    Permission.CONSOLIDATE_CREATE,
    Permission.EXPORT_READ,
  ],
  [Role.PROVEEDOR]: [
    Permission.PRODUCT_READ,
    Permission.CONSOLIDATE_READ_OWN,
    Permission.EXPORT_READ,
  ],
};
