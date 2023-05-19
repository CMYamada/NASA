const mongoose = require('mongoose');

const planetsSchema = mongoose.Schema({
    keplerName: {
        type: String,
        required: true
    }
});

// connects planetsSchema with the "planets" collection
module.exports = mongoose.model('Planet', planetsSchema);