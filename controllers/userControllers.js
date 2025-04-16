// controllers/userControllers.js

// Dummy controller to get all "fac" (whatever that is!)
exports.getFac = (req, res) => {
    res.status(200).json({ message: 'getFac called successfully' });
};

// Dummy controller to get a "fac" by ID
exports.getFacById = (req, res) => {
    const { id } = req.params;
    res.status(200).json({ message: `getFacById called for ID: ${id}` });
};
