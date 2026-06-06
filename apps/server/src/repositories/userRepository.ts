type Queryable = {
  query: <T>(queryText: string, values?: unknown[]) => Promise<{ rows: T[] }>;
};

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
}

export class UserRepository {
  constructor(private readonly pool: Queryable) {}

  async create(email: string, passwordHash: string, displayName: string): Promise<UserRecord> {
    const result = await this.pool.query<UserRecord>(
      `insert into users (email, password_hash, display_name)
       values ($1, $2, $3)
       returning id, email, password_hash, display_name`,
      [email, passwordHash, displayName]
    );
    await this.pool.query("insert into player_stats (user_id) values ($1) on conflict do nothing", [result.rows[0].id]);
    return result.rows[0];
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query<UserRecord>(
      "select id, email, password_hash, display_name from users where email = $1",
      [email]
    );
    return result.rows[0] ?? null;
  }
}
