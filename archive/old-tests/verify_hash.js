const bcrypt = require('bcrypt')

const password = 'admin123'
bcrypt.hash(password, 10).then(hash => {
    console.log('Generated hash:', hash)
    return bcrypt.compare(password, hash)
}).then(match => {
    console.log('Verification match:', match)
})
