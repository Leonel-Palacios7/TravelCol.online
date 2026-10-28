import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import {
  adminBookingListSchema, adminDocumentReviewSchema, adminListSchema, adminPaymentListSchema, adminProviderStatusSchema,
  adminServiceModerationSchema, adminUserRoleSchema, adminUserStatusSchema, cancelBookingSchema, commissionSettingSchema,
  paginationSchema, refundDecisionSchema, reviewModerationSchema, settlementCreateSchema, settlementPaySchema,
} from '@travelcol/contracts';
import { AuthUser, CurrentUser, Roles } from '../../common/auth.decorators';
import { ApiZodBody, ZodPipe } from '../../common/zod';
import { BookingsService } from '../bookings/bookings.service';
import { FinanceService } from '../finance/finance.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AdminService } from './admin.service';

const uuid = new ParseUUIDPipe();
const statusQuery = z.object({ status: z.string().trim().max(40).optional() }).strict();
const applicationDecision = z.object({ decision: z.enum(['APPROVE', 'REJECT']), notes: z.string().trim().min(5).max(500) }).strict();
const ticketUpdate = z.object({ status: z.enum(['IN_PROGRESS', 'CLOSED']), response: z.string().trim().max(4000).optional() }).strict();
const bookingListQuery = adminBookingListSchema.extend({ attention: z.enum(['true', 'false']).optional() });

/**
 * Panel administrativo. SUPPORT = permisos operativos (consulta y moderación de contenido).
 * ADMIN = además operaciones financieras, usuarios, roles, configuración y auditoría.
 */
@ApiTags('Administración')
@Roles('ADMIN', 'SUPPORT')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly finance: FinanceService,
    private readonly bookings: BookingsService,
    private readonly reviews: ReviewsService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  // ---- Proveedores ----
  @Get('provider-applications')
  applications(@Query(new ZodPipe(statusQuery)) q: { status?: string }) {
    return this.admin.listApplications(q.status);
  }

  @Roles('ADMIN')
  @Post('provider-applications/:id/decision')
  @HttpCode(200)
  @ApiZodBody(applicationDecision)
  decide(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(applicationDecision)) b: z.output<typeof applicationDecision>) {
    return this.admin.decideApplication(u, id, b.decision, b.notes);
  }

  @Get('providers')
  providers(@Query(new ZodPipe(adminListSchema)) q: z.output<typeof adminListSchema>) {
    return this.admin.listProviders(q);
  }

  @Get('providers/:id')
  provider(@Param('id', uuid) id: string) {
    return this.admin.providerDetail(id);
  }

  @Roles('ADMIN')
  @Patch('providers/:id/status')
  @ApiZodBody(adminProviderStatusSchema)
  providerStatus(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(adminProviderStatusSchema)) b: z.output<typeof adminProviderStatusSchema>) {
    return this.admin.setProviderStatus(u, id, b.status, b.reason);
  }

  @Patch('documents/:id')
  @ApiZodBody(adminDocumentReviewSchema)
  reviewDocument(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(adminDocumentReviewSchema)) b: z.output<typeof adminDocumentReviewSchema>) {
    return this.admin.reviewDocument(u, id, b.status, b.notes);
  }

  @Get('documents/:id/file')
  async documentFile(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Res() res: Response) {
    const { doc, data } = await this.admin.documentFile(u, id);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(data);
  }

  // ---- Servicios ----
  @Get('services')
  services(@Query(new ZodPipe(adminListSchema)) q: z.output<typeof adminListSchema>) {
    return this.admin.listServices(q);
  }

  @Post('services/:id/moderation')
  @HttpCode(200)
  @ApiZodBody(adminServiceModerationSchema)
  moderate(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(adminServiceModerationSchema)) b: z.output<typeof adminServiceModerationSchema>) {
    return this.admin.moderateService(u, id, b.decision, b.reason);
  }

  // ---- Reservas y pagos ----
  @Get('bookings')
  listBookings(@Query(new ZodPipe(bookingListQuery)) q: z.output<typeof bookingListQuery>) {
    return this.admin.listBookings({ ...q, attention: q.attention === 'true' });
  }

  @Roles('ADMIN')
  @Post('bookings/:id/cancel')
  @HttpCode(200)
  @ApiZodBody(cancelBookingSchema)
  cancelBooking(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(cancelBookingSchema)) b: { reason: string }) {
    return this.bookings.cancel(u, id, b.reason, 'STAFF');
  }

  @Get('payments')
  payments(@Query(new ZodPipe(adminPaymentListSchema)) q: z.output<typeof adminPaymentListSchema>) {
    return this.admin.listPayments(q);
  }

  @Get('webhook-events')
  webhookEvents(@Query(new ZodPipe(paginationSchema)) q: z.output<typeof paginationSchema>) {
    return this.admin.webhookEvents(q.page, q.pageSize);
  }

  @Roles('ADMIN')
  @Get('refunds')
  refunds(@Query(new ZodPipe(statusQuery)) q: { status?: string }) {
    return this.admin.listRefunds(q.status);
  }

  @Roles('ADMIN')
  @Post('refunds/:id/decision')
  @HttpCode(200)
  @ApiZodBody(refundDecisionSchema)
  refundDecision(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(refundDecisionSchema)) b: z.output<typeof refundDecisionSchema>) {
    return this.admin.decideRefund(u, id, b.decision, b.notes, b.externalReference);
  }

  // ---- Liquidaciones ----
  @Roles('ADMIN')
  @Get('settlements')
  settlements() {
    return this.admin.listSettlements();
  }

  @Roles('ADMIN')
  @Get('settlements/balances')
  balances() {
    return this.admin.balances();
  }

  @Roles('ADMIN')
  @Post('settlements')
  @ApiZodBody(settlementCreateSchema)
  createSettlement(@CurrentUser() u: AuthUser, @Body(new ZodPipe(settlementCreateSchema)) b: z.output<typeof settlementCreateSchema>) {
    return this.finance.createSettlement(b.providerId, b.periodEnd, u.id);
  }

  @Roles('ADMIN')
  @Post('settlements/:id/pay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Registra una transferencia YA ejecutada fuera de la plataforma' })
  @ApiZodBody(settlementPaySchema)
  paySettlement(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(settlementPaySchema)) b: z.output<typeof settlementPaySchema>) {
    return this.finance.markSettlementPaid(id, b.payoutReference, b.notes, u.id);
  }

  @Roles('ADMIN')
  @Post('settlements/:id/cancel')
  @HttpCode(200)
  cancelSettlement(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string) {
    return this.finance.cancelSettlement(id, u.id);
  }

  // ---- Usuarios y configuración (solo ADMIN) ----
  @Roles('ADMIN')
  @Get('users')
  users(@Query(new ZodPipe(adminListSchema)) q: z.output<typeof adminListSchema>) {
    return this.admin.listUsers(q);
  }

  @Roles('ADMIN')
  @Patch('users/:id/status')
  @ApiZodBody(adminUserStatusSchema)
  userStatus(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(adminUserStatusSchema)) b: z.output<typeof adminUserStatusSchema>) {
    return this.admin.setUserStatus(u, id, b.status, b.reason);
  }

  @Roles('ADMIN')
  @Patch('users/:id/role')
  @ApiZodBody(adminUserRoleSchema)
  userRole(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(adminUserRoleSchema)) b: z.output<typeof adminUserRoleSchema>) {
    return this.admin.setUserRole(u, id, b.role, b.reason);
  }

  @Roles('ADMIN')
  @Get('settings')
  settings() {
    return this.admin.getSettings();
  }

  @Roles('ADMIN')
  @Put('settings/commission')
  @ApiZodBody(commissionSettingSchema)
  commission(@CurrentUser() u: AuthUser, @Body(new ZodPipe(commissionSettingSchema)) b: z.output<typeof commissionSettingSchema>) {
    return this.admin.setCommission(u, b.commissionBps, b.reason);
  }

  @Roles('ADMIN')
  @Get('audit-logs')
  audit(@Query(new ZodPipe(adminListSchema)) q: z.output<typeof adminListSchema>) {
    return this.admin.auditLogs(q);
  }

  // ---- Reseñas y PQR ----
  @Get('reviews')
  listReviews(@Query(new ZodPipe(statusQuery)) q: { status?: string }) {
    return this.admin.listReviews(q.status);
  }

  @Patch('reviews/:id')
  @ApiZodBody(reviewModerationSchema)
  moderateReview(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(reviewModerationSchema)) b: z.output<typeof reviewModerationSchema>) {
    return this.reviews.moderate(id, b.status, b.reason, u.id);
  }

  @Get('tickets')
  tickets(@Query(new ZodPipe(statusQuery)) q: { status?: string }) {
    return this.admin.listTickets(q.status);
  }

  @Patch('tickets/:id')
  @ApiZodBody(ticketUpdate)
  ticket(@CurrentUser() u: AuthUser, @Param('id', uuid) id: string, @Body(new ZodPipe(ticketUpdate)) b: z.output<typeof ticketUpdate>) {
    return this.admin.updateTicket(u, id, b.status, b.response);
  }

  // ---- Reportes (solo ADMIN) ----
  @Roles('ADMIN')
  @Get('reports/bookings.csv')
  async csv(@CurrentUser() u: AuthUser, @Res() res: Response) {
    const csv = await this.admin.bookingsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reservas-travelcol.csv"');
    res.setHeader('Cache-Control', 'no-store');
    res.send('﻿' + csv);
    void u;
  }

  @Roles('ADMIN')
  @Get('reports/provider-performance')
  performance() {
    return this.admin.performance();
  }
}
