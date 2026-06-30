import { Global, Module } from "@nestjs/common";
import { RolesGuard } from "./guards/roles.guard";
import { TenantGuard } from "./guards/tenant.guard";

@Global()
@Module({
  providers: [RolesGuard, TenantGuard],
  exports: [RolesGuard, TenantGuard],
})
export class CommonModule {}
