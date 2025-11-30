const FAQ = require('../models/FAQ');

// Get all FAQs (Public)
exports.getAllFAQs = async (req, res, next) => {
  try {
    const faqs = await FAQ.find()
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: faqs
    });
  } catch (error) {
    next(error);
  }
};

// Create FAQ (Admin)
exports.createFAQ = async (req, res, next) => {
  try {
    const { question, answer, category } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: 'Question and answer are required'
      });
    }

    const faq = await FAQ.create({
      question: question.trim(),
      answer: answer.trim(),
      category: category || 'general'
    });

    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }
    next(error);
  }
};

// Update FAQ (Admin)
exports.updateFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, answer, category } = req.body;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Update fields if provided
    if (question !== undefined) {
      faq.question = question.trim();
    }
    if (answer !== undefined) {
      faq.answer = answer.trim();
    }
    if (category !== undefined) {
      faq.category = category;
    }

    await faq.save();

    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(err => err.message).join(', ')
      });
    }
    next(error);
  }
};

// Delete FAQ (Admin)
exports.deleteFAQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    await FAQ.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

