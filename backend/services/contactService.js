const { getDatabase, getObjectId } = require('../config/database');

class ContactService {
  /**
   * Create a new contact submission
   */
  static async createContact(contactData, userId = null) {
    const db = getDatabase();
    const contact = {
      ...contactData,
      status: 'new',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    if (userId) {
      contact.user_id = getObjectId(userId);
    }
    
    const result = await db.collection('contacts').insertOne(contact);
    const created = await db.collection('contacts').findOne({ _id: result.insertedId });
    
    return this._formatContact(created);
  }

  /**
   * Get contact by ID
   */
  static async getContactById(contactId) {
    const db = getDatabase();
    const contact = await db.collection('contacts').findOne({ _id: getObjectId(contactId) });
    return contact ? this._formatContact(contact) : null;
  }

  /**
   * Get all contacts (for admin)
   */
  static async getAllContacts(skip = 0, limit = 100, status = null) {
    const db = getDatabase();
    const query = status ? { status } : {};
    
    const contacts = [];
    const cursor = db.collection('contacts')
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);
    
    for await (const contact of cursor) {
      contacts.push(this._formatContact(contact));
    }
    
    return contacts;
  }

  /**
   * Update contact status
   */
  static async updateContactStatus(contactId, status) {
    const db = getDatabase();
    const result = await db.collection('contacts').updateOne(
      { _id: getObjectId(contactId) },
      { $set: { status, updated_at: new Date() } }
    );
    
    if (result.modifiedCount) {
      return await this.getContactById(contactId);
    }
    
    return null;
  }

  /**
   * Delete contact
   */
  static async deleteContact(contactId) {
    const db = getDatabase();
    const result = await db.collection('contacts').deleteOne({ _id: getObjectId(contactId) });
    return result.deletedCount > 0;
  }

  /**
   * Format contact document for response
   */
  static _formatContact(contact) {
    if (!contact) return null;
    
    return {
      id: contact._id.toString(),
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      status: contact.status,
      user_id: contact.user_id ? contact.user_id.toString() : null,
      created_at: contact.created_at,
      updated_at: contact.updated_at
    };
  }
}

module.exports = ContactService;
