const express = require('express');
const router = express.Router();
const ContactService = require('../services/contactService');
const { getCurrentAdmin, getOptionalUser } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Submit a contact form (public endpoint - authentication optional)
 * If user is logged in, their user_id will be associated with the contact
 */
router.post('', getOptionalUser, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ detail: 'All fields are required' });
    }
    
    logger.info(`📧 Contact form submission from: ${email}`);
    
    const userId = req.user ? req.user.id : null;
    const contact = await ContactService.createContact({
      name,
      email,
      subject,
      message
    }, userId);
    
    logger.info(`✓ Contact submission created (ID: ${contact.id})`);
    res.status(201).json(contact);
  } catch (error) {
    next(error);
  }
});

/**
 * Get all contact submissions (admin only)
 */
router.get('/admin/all', getCurrentAdmin, async (req, res, next) => {
  try {
    const skip = parseInt(req.query.skip || '0', 10);
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 1000);
    const status = req.query.status;
    
    logger.info(`📋 Admin ${req.user.email} requested contacts list (skip=${skip}, limit=${limit}, status=${status})`);
    
    const contacts = await ContactService.getAllContacts(skip, limit, status);
    
    logger.info(`✓ Returned ${contacts.length} contacts`);
    res.json(contacts);
  } catch (error) {
    next(error);
  }
});

/**
 * Get contact by ID (admin only)
 */
router.get('/admin/:contactId', getCurrentAdmin, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    logger.info(`👁️ Admin ${req.user.email} requested contact: ${contactId}`);
    
    const contact = await ContactService.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ detail: 'Contact not found' });
    }
    
    res.json(contact);
  } catch (error) {
    next(error);
  }
});

/**
 * Update contact status (admin only)
 */
router.patch('/admin/:contactId/status', getCurrentAdmin, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const { status } = req.body;
    
    if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({ detail: 'Invalid status value' });
    }
    
    logger.info(`✏️ Admin ${req.user.email} updating contact ${contactId} status to: ${status}`);
    
    const contact = await ContactService.updateContactStatus(contactId, status);
    if (!contact) {
      return res.status(404).json({ detail: 'Contact not found' });
    }
    
    logger.info(`✓ Contact status updated successfully`);
    res.json(contact);
  } catch (error) {
    next(error);
  }
});

/**
 * Delete contact (admin only)
 */
router.delete('/admin/:contactId', getCurrentAdmin, async (req, res, next) => {
  try {
    const { contactId } = req.params;
    logger.info(`🗑️ Admin ${req.user.email} deleting contact: ${contactId}`);
    
    const success = await ContactService.deleteContact(contactId);
    if (!success) {
      return res.status(404).json({ detail: 'Contact not found' });
    }
    
    logger.info(`✓ Contact deleted successfully`);
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
