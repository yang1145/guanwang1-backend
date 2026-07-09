const db = require('../config/db');

class TicketDepartment {
  static async getAll() {
    const [rows] = await db.query('SELECT id, name, description, created_at FROM ticket_departments ORDER BY id');
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query('SELECT id, name, description, created_at FROM ticket_departments WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async getByName(name) {
    const [rows] = await db.query('SELECT id, name, description FROM ticket_departments WHERE name = ?', [name]);
    return rows[0] || null;
  }

  static async create(name, description) {
    const [result] = await db.query(
      'INSERT INTO ticket_departments (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.insertId;
  }

  static async update(id, name, description) {
    const [result] = await db.query(
      'UPDATE ticket_departments SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await db.query('DELETE FROM ticket_departments WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

module.exports = TicketDepartment;
