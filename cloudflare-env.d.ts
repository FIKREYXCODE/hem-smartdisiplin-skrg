declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_ACCESS_CODE?: string;
    DISCIPLINE_ACCESS_CODE?: string;
  }
}
