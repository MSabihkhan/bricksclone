import { DbDriver, Row } from '../Driver';
import { Tag } from '../types';

export class TagRepository {
  constructor(private driver: DbDriver) {}

  private mapRowToTag(row: Row): Tag {
    return {
      id: String(row.id),
      name: String(row.name),
      location: row.location ? String(row.location) : null,
      mode: String(row.mode),
      categories: JSON.parse(String(row.categories || '{}')),
      duration: String(row.duration),
      strict: Number(row.strict),
      createdAt: Number(row.created_at),
    };
  }

  async registerTag(tag: Tag): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO tags (id, name, location, mode, categories, duration, strict, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tag.id,
        tag.name,
        tag.location,
        tag.mode,
        JSON.stringify(tag.categories),
        tag.duration,
        tag.strict,
        tag.createdAt,
      ]
    );
  }

  async getTagById(id: string): Promise<Tag | undefined> {
    const row = await this.driver.get('SELECT * FROM tags WHERE id = ?', [id]);
    return row ? this.mapRowToTag(row) : undefined;
  }

  async listTags(): Promise<Tag[]> {
    const rows = await this.driver.query('SELECT * FROM tags ORDER BY created_at DESC');
    return rows.map(r => this.mapRowToTag(r));
  }

  async updateTag(id: string, patch: Partial<Tag>): Promise<void> {
    const current = await this.getTagById(id);
    if (!current) return;
    
    const updated = { ...current, ...patch };
    await this.registerTag(updated);
  }

  async deleteTag(id: string): Promise<void> {
    await this.driver.execute('DELETE FROM tags WHERE id = ?', [id]);
  }
}
