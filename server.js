require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do pool de conexão MySQL usando variáveis de ambiente
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =========================
// ROTAS PARA RELATÓRIOS
// =========================

// GET - Lista todos os relatórios
app.get('/relatorios', (req, res) => {
  const sql = 'SELECT * FROM relatorios ORDER BY data DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar relatórios:', err);
      return res.status(500).json({ message: 'Erro ao buscar relatórios' });
    }
    res.json(results);
  });
});

// POST - Insere novo relatório
app.post('/relatorios', (req, res) => {
  const {
    data,
    limiteBradesco,
    antecipadoBradesco,
    limiteItau,
    antecipadoItau,
    emprestimo,
    totalContas,
  } = req.body;

  const limite_total = limiteBradesco + limiteItau;
  const disponivel_bradesco = limiteBradesco - antecipadoBradesco;
  const disponivel_itau = limiteItau - antecipadoItau;
  const limite_disponivel = disponivel_bradesco + disponivel_itau;
  const total_antecipado = antecipadoBradesco + antecipadoItau;
  const lucro = limite_disponivel + emprestimo + totalContas;

  const sql = `
    INSERT INTO relatorios 
    (data, limite_bradesco, antecipado_bradesco, limite_itau, antecipado_itau, emprestimo, total_contas, limite_total, disponivel_bradesco, disponivel_itau, limite_disponivel, total_antecipado, lucro) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const valores = [
    data,
    limiteBradesco,
    antecipadoBradesco,
    limiteItau,
    antecipadoItau,
    emprestimo,
    totalContas,
    limite_total,
    disponivel_bradesco,
    disponivel_itau,
    limite_disponivel,
    total_antecipado,
    lucro,
  ];

  db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Erro ao salvar relatório:', err);
      return res.status(500).json({ message: 'Erro ao salvar relatório' });
    }
    res.status(201).json({ message: 'Relatório salvo com sucesso', id: result.insertId });
  });
});

// PUT - Atualiza relatório existente
app.put('/relatorios/:id', (req, res) => {
  const { id } = req.params;
  const {
    data,
    limiteBradesco,
    antecipadoBradesco,
    limiteItau,
    antecipadoItau,
    emprestimo,
    totalContas,
  } = req.body;

  const limite_total = limiteBradesco + limiteItau;
  const disponivel_bradesco = limiteBradesco - antecipadoBradesco;
  const disponivel_itau = limiteItau - antecipadoItau;
  const limite_disponivel = disponivel_bradesco + disponivel_itau;
  const total_antecipado = antecipadoBradesco + antecipadoItau;
  const lucro = limite_disponivel + emprestimo + totalContas;

  const sql = `
    UPDATE relatorios SET 
      data = ?, 
      limite_bradesco = ?, antecipado_bradesco = ?, 
      limite_itau = ?, antecipado_itau = ?, 
      emprestimo = ?, 
      limite_total = ?, 
      disponivel_bradesco = ?, disponivel_itau = ?, 
      limite_disponivel = ?, 
      total_antecipado = ?, 
      lucro = ?, total_contas = ? 
    WHERE id = ?
  `;

  const valores = [
    data,
    limiteBradesco,
    antecipadoBradesco,
    limiteItau,
    antecipadoItau,
    emprestimo,
    limite_total,
    disponivel_bradesco,
    disponivel_itau,
    limite_disponivel,
    total_antecipado,
    lucro,
    totalContas,
    id,
  ];

  db.query(sql, valores, (err) => {
    if (err) {
      console.error('Erro ao atualizar relatório:', err);
      return res.status(500).json({ message: 'Erro ao atualizar relatório' });
    }
    res.json({ message: 'Relatório atualizado com sucesso' });
  });
});

// DELETE - Exclui relatório
app.delete('/relatorios/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM relatorios WHERE id = ?';
  db.query(sql, [id], (err) => {
    if (err) {
      console.error('Erro ao excluir relatório:', err);
      return res.status(500).json({ message: 'Erro ao excluir relatório' });
    }
    res.json({ message: 'Relatório excluído com sucesso' });
  });
});

// =========================
// ROTAS PARA LUCRO_MENSAL
// =========================

// GET - Retorna todos os dados da tabela lucro_mensal
app.get('/lucro-mensal', (req, res) => {
  const sql = 'SELECT * FROM lucro_mensal ORDER BY mes';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar lucro mensal:', err);
      return res.status(500).json({ message: 'Erro ao buscar lucro mensal' });
    }
    res.json(results);
  });
});

// POST - Salva ou atualiza os dados dos 12 meses
app.post('/lucro-mensal', (req, res) => {
  const dados = req.body; // Espera um array com 12 objetos
  console.log('Dados recebidos no POST /lucro-mensal:', dados);

  const queries = dados.map((item) => {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO lucro_mensal (mes, receber, pagar, observacao)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          receber = VALUES(receber),
          pagar = VALUES(pagar),
          observacao = VALUES(observacao)
      `;
      const valores = [item.mes, item.receber, item.pagar, item.observacao];
      db.query(sql, valores, (err) => {
        if (err) {
          console.error('Erro ao inserir/atualizar mês:', item.mes, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });

  Promise.all(queries)
    .then(() => res.status(200).json({ message: 'Lucro mensal salvo com sucesso' }))
    .catch(() => res.status(500).json({ message: 'Erro ao salvar lucro mensal' }));
});

// INICIAR SERVIDOR - última coisa
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
