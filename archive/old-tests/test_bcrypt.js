const bcrypt = require('bcrypt')

const hash = '$2b$10$rBqtVMzNuTYCi3XiKZ4dqOBExq8KRqp7RREniuvlnm.0BDPk6qy7G'
const password = 'admin123'

bcrypt.compare(password, hash).then(match => {
    console.log('Match result for admin123:', match)
})

bcrypt.hash('admin123', 10).then(newHash => {
    console.log('Newly generated hash for admin123:', newHash)
})
