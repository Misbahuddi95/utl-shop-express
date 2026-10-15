export const companyCanPublish = (status: string) => status === "paid" || status === "approved";
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export function validProductPrice(price: number) { return Number.isFinite(price) && price >= 0; }