export interface DestinationRow {
  id: string;
  slug: string;
  name: string;
  department: string;
  summary: string;
  isPilot: boolean;
  _count: { services: number };
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  _count: { services: number };
}

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  authorName: string;
  verifiedBooking: boolean;
}
export interface ProviderMe {
  id: string; slug: string; businessName: string; legalName: string; taxId: string; rntNumber: string | null; rntVerified: boolean;
  contactPhone: string; description: string; status: string;
  documents: Array<{ id: string; type: string; originalName: string; status: string; reviewNotes: string | null; createdAt: string; sizeBytes?: number }>;
}
export interface ProviderBookingRow {
  id: string; code: string; status: string; serviceTitle: string; startsAt: string; participants: number; participantNames: string[];
  customerName: string; contactPhone: string; notes: string | null; subtotalCop: number; commissionCop: number; providerNetCop: number;
}
export interface LedgerRow { id: string; type: string; amountCop: number; description: string; createdAt: string; settlementId: string | null; booking: { code: string } | null }
