import { database } from "@/lib/cases-db";
import { apiJson, apiOptions } from "@/lib/api-response";

export const runtime = "edge";
export function OPTIONS(request: Request) { return apiOptions(request); }

type CountRow = { count: number };
type TrendRow = { month_key: string; count: number };

function recentMonths() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (5 - index));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("ms-MY", { month: "short", timeZone: "UTC" }).format(date),
    };
  });
}

export async function GET(request: Request) {
  try {
    const months = recentMonths();
    const [total, pendingAction, inProgress, completed, pendingApproval, pendingSsdm, ssdmAttention, updated, trendRows] = await Promise.all([
      database().prepare("SELECT COUNT(*) AS count FROM cases WHERE deleted_at IS NULL").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM cases WHERE deleted_at IS NULL AND traffic_status = 'red'").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM cases WHERE deleted_at IS NULL AND traffic_status = 'yellow'").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM cases WHERE deleted_at IS NULL AND traffic_status = 'green'").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM cases WHERE deleted_at IS NULL AND admin_review_requested = 1").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM ssdm_requests s JOIN cases c ON c.id = s.case_id WHERE c.deleted_at IS NULL AND s.status = 'pending'").first<CountRow>(),
      database().prepare("SELECT COUNT(*) AS count FROM ssdm_requests s JOIN cases c ON c.id = s.case_id WHERE c.deleted_at IS NULL AND s.status IN ('rejected','returned','needs_further_action')").first<CountRow>(),
      database().prepare("SELECT MAX(updated_at) AS updated_at FROM cases WHERE deleted_at IS NULL").first<{ updated_at: string | null }>(),
      database().prepare("SELECT substr(date, 1, 7) AS month_key, COUNT(*) AS count FROM cases WHERE deleted_at IS NULL AND substr(date, 1, 7) >= ? GROUP BY substr(date, 1, 7) ORDER BY month_key").bind(months[0].key).all<TrendRow>(),
    ]);
    const trendCounts = new Map(trendRows.results.map(row => [row.month_key, Number(row.count) || 0]));
    return apiJson({
      summary: {
        total: total?.count || 0,
        pendingAction: pendingAction?.count || 0,
        inProgress: inProgress?.count || 0,
        completed: completed?.count || 0,
        pendingApproval: pendingApproval?.count || 0,
        pendingSsdm: pendingSsdm?.count || 0,
        ssdmAttention: ssdmAttention?.count || 0,
        updatedAt: updated?.updated_at || null,
        trend: months.map(month => ({ ...month, count: trendCounts.get(month.key) || 0 })),
      },
    }, request, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    console.error("Public discipline summary failed", error);
    return apiJson({ error: "Ringkasan awam belum dapat dimuatkan." }, request, { status: 503 });
  }
}
