const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306, // <-- Aqui você define a porta
  user: 'root',
  password: '', // Coloque a senha se tiver
  database: 'controle_financeiro'
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar:', err);
    return;
  }
  console.log('Conectado ao MySQL!');
});

module.exports = connection;