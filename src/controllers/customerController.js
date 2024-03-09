const { identifyCustomer,retrieve } = require('../services/customerService');

const identify = async (req, res) => {
    try {
        const { email, phoneNumber } = req.body;
        const { linkedId, id } = await identifyCustomer(email, phoneNumber);
        const ans = await retrieve(linkedId, id);
        res.json(ans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error identifying customer' });
    }
};

module.exports = {
    identify,
};
