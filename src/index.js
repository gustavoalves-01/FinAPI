const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

// Middleware
const verifyExistingAccountByCPF = (req, res, next) => {
  const { cpf } = req.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: 'Customer not found' });
  }

  req.customer = customer;

  return next();
};

const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount;
    } else if (operation.type === 'debit') {
      return acc - operation.amount;
    } else {
      return acc;
    }
  }, 0);

  return balance;
};

app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({ error: 'Customer already exists' });
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: [],
  });

  return res.status(201).send();
});

app.post('/deposit', verifyExistingAccountByCPF, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: 'credit',
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.post('/withdraw', verifyExistingAccountByCPF, (req, res) => {
  const { amount } = req.body;
  const { customer } = req;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: 'Insuficient funds' });
  }

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: 'debit',
  };

  customer.statement.push(statementOperation);

  return res.status(201).send();
});

app.put('/account', verifyExistingAccountByCPF, (req, res) => {
  const { name } = req.body;
  const { customer } = req;

  customer.name = name;

  return res.status(201).send();
});

app.get('/account', verifyExistingAccountByCPF, (req, res) => {
  const { customer } = req;

  return res.json(customer);
});

app.get('/statement', verifyExistingAccountByCPF, (req, res) => {
  const { customer } = req;
  return res.json(customer.statement);
});

app.get('/statement/date', verifyExistingAccountByCPF, (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const dateFormatted = new Date(date + ' 00:00');

  const statement = customer.statement.filter(
    (operation) =>
      operation.createdAt.toDateString() ===
      new Date(dateFormatted).toDateString()
  );

  return res.json(statement);
});

app.get('/balance', verifyExistingAccountByCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  return res.json(balance);
});

app.delete('/account', verifyExistingAccountByCPF, (req, res) => {
  const { customer } = req;

  customers.splice(customer, 1);

  return res.status(200).json(customers);
});

app.listen(3333, () => console.log('Server is running at 3333'));
