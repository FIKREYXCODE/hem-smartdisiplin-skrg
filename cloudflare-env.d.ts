declare namespace Cloudflare {
  interface Env {
    SYSTEM_ADMIN_BOOTSTRAP_CODE?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
