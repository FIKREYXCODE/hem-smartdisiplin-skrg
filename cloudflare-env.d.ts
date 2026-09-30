declare namespace Cloudflare {
  interface Env {
    SYSTEM_ADMIN_BOOTSTRAP_CODE?: string;
    SUPER_ADMIN_ACCESS_CODE?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
