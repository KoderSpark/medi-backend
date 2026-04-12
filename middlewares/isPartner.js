const jwt = require('jsonwebtoken');
const Partner = require('../models/Partner');

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'partner') {
      console.log('isPartner error: decoded.type is not partner', decoded);
      return res.status(403).json({ message: 'Access denied: not a partner token' });
    }

    // Check if partner exists and is active
    const partner = await Partner.findById(decoded.id);
    if (!partner) {
      console.log('isPartner error: partner not found for id', decoded.id);
      return res.status(403).json({ message: 'Account not found' });
    }
    if (partner.status !== 'Active') {
      console.log('isPartner error: partner status is', partner.status);
      return res.status(403).json({ message: 'Account not approved or inactive' });
    }

    req.partnerId = decoded.id;
    req.partner = partner;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid token' });
  }
};